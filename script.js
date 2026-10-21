// Adresse de l'API (OCMovies-API en local)
const urlApi = "http://localhost:8000/api/v1";

// Image affichée quand l'affiche d'un film ne charge pas
const imageParDefaut = "https://placehold.co/200x300?text=Affiche+indisponible";


// ------------------------------------------------------------
// 1. Récupération des données
// ------------------------------------------------------------

// Récupère "nombre" films en suivant la pagination (l'API renvoie 5 films par page)
async function fetchMovies(url, nombre) {
  let films = [];

  while (url !== null && films.length < nombre) {
    const reponse = await fetch(url);
    const data = await reponse.json();
    films = films.concat(data.results);
    url = data.next;
  }

  // On garde seulement le nombre demandé
  return films.slice(0, nombre);
}

// Récupère les détails d'un seul film grâce à son id
async function fetchMovieDetail(id) {
  const reponse = await fetch(urlApi + "/titles/" + id);
  return await reponse.json();
}

// Récupère la liste des genres
async function fetchGenres() {
  const reponse = await fetch(urlApi + "/genres/?page_size=50");
  const data = await reponse.json();
  return data.results;
}


// ------------------------------------------------------------
// 2. Affichage des films
// ------------------------------------------------------------

// Crée un <li> pour un film
function createMovieCard(film) {
  const li = document.createElement("li");
  li.className = "movie-card";

  const img = document.createElement("img");
  img.src = film.image_url;
  img.alt = film.title;
  // Si l'image ne charge pas, on met une image par défaut
  img.onerror = function () {
    img.src = imageParDefaut;
  };

  // Bandeau sur l'affiche : le titre et un bouton "Détails"
  const bandeau = document.createElement("div");
  bandeau.className = "movie-card-overlay";

  const titre = document.createElement("p");
  titre.className = "movie-card-title";
  titre.textContent = film.title;

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.textContent = "Détails";

  bandeau.appendChild(titre);
  bandeau.appendChild(bouton);

  li.appendChild(img);
  li.appendChild(bandeau);

  // Seul le bouton "Détails" ouvre la modale (pas l'affiche)
  bouton.addEventListener("click", function () {
    openModal(film.id);
  });

  return li;
}

// Remplit une grille (ul) avec la liste de films
function renderGrid(idGrille, films) {
  const grille = document.getElementById(idGrille);
  grille.innerHTML = "";

  for (let i = 0; i < films.length; i++) {
    grille.appendChild(createMovieCard(films[i]));
  }

  applyVisibility(grille);
  updateSeeMoreButton(idGrille);
}


// ------------------------------------------------------------
// 3. Chargement des sections de la page
// ------------------------------------------------------------

async function loadBestMovie() {
  // On récupère les 7 films les mieux notés : le 1er est le meilleur film,
  // les 6 autres vont dans la section "Films les mieux notés"
  const films = await fetchMovies(urlApi + "/titles/?sort_by=-imdb_score", 7);
  const meilleur = films[0];
  const autres = films.slice(1);

  // Le résumé n'est pas dans la liste, il faut donc demander le détail du film
  const detail = await fetchMovieDetail(meilleur.id);

  const image = document.getElementById("best-movie-image");
  image.src = meilleur.image_url;
  image.alt = meilleur.title;
  image.onerror = function () {
    image.src = imageParDefaut;
  };

  document.getElementById("best-movie-title").textContent = meilleur.title;
  document.getElementById("best-movie-summary").textContent = detail.long_description || "" || detail.description;

  // On garde l'id du film dans le bouton pour pouvoir ouvrir la modale
  document.getElementById("best-movie-details-btn").dataset.movieId = meilleur.id;

  renderGrid("top-rated-grid", autres);
}

async function loadCategory(idGrille, genre) {
  const url = urlApi + "/titles/?genre=" + genre + "&sort_by=-imdb_score";
  const films = await fetchMovies(url, 6);
  renderGrid(idGrille, films);
}

// Remplit le menu déroulant avec tous les genres
async function loadGenresList() {
  const select = document.getElementById("category-select");
  const genres = await fetchGenres();

  for (let i = 0; i < genres.length; i++) {
    const option = document.createElement("option");
    option.value = genres[i].name;
    option.textContent = genres[i].name;
    select.appendChild(option);
  }
}


// ------------------------------------------------------------
// 4. Bouton "Voir plus" (2 films en mobile, 4 en tablette, 6 en ordinateur)
// ------------------------------------------------------------

function getVisibleCount() {
  const largeur = window.innerWidth;

  if (largeur >= 1000) {
    return 6;
  } else if (largeur >= 640) {
    return 4;
  } else {
    return 2;
  }
}

// Cache les films en trop dans une grille
function applyVisibility(grille) {
  const cartes = grille.querySelectorAll(".movie-card");
  let nombreAffiches = getVisibleCount();

  // Si l'utilisateur a cliqué sur "Voir plus", on affiche tout
  if (grille.dataset.expanded === "true") {
    nombreAffiches = cartes.length;
  }

  for (let i = 0; i < cartes.length; i++) {
    if (i < nombreAffiches) {
      cartes[i].style.display = "";
    } else {
      cartes[i].style.display = "none";
    }
  }
}

// Affiche ou cache le bouton "Voir plus" d'une grille
function updateSeeMoreButton(idGrille) {
  const grille = document.getElementById(idGrille);
  const bouton = document.querySelector('[data-target="' + idGrille + '"]');

  // Pas de bouton "Voir plus" pour cette grille (ex : "Autres")
  if (bouton === null) {
    return;
  }

  const nombreCartes = grille.querySelectorAll(".movie-card").length;

  // Si tous les films sont déjà visibles, pas besoin de bouton
  if (nombreCartes <= getVisibleCount()) {
    bouton.style.display = "none";
    return;
  }

  bouton.style.display = "";
  if (grille.dataset.expanded === "true") {
    bouton.textContent = "Voir moins";
  } else {
    bouton.textContent = "Voir plus";
  }
}

function initSeeMoreButtons() {
  const boutons = document.querySelectorAll("[data-target]");

  for (let i = 0; i < boutons.length; i++) {
    const bouton = boutons[i];

    bouton.addEventListener("click", function () {
      const grille = document.getElementById(bouton.dataset.target);

      if (grille.dataset.expanded === "true") {
        grille.dataset.expanded = "false";
      } else {
        grille.dataset.expanded = "true";
      }

      applyVisibility(grille);
      updateSeeMoreButton(grille.id);
    });
  }

  // Quand on change la taille de la fenêtre, on remet les grilles à zéro
  // (retour à "Voir plus") et on recalcule les films visibles
  window.addEventListener("resize", function () {
    const grilles = document.querySelectorAll("ul[id$='-grid']");
    for (let i = 0; i < grilles.length; i++) {
      const bouton = document.querySelector('[data-target="' + grilles[i].id + '"]');

      // La section "Autres" n'a pas de bouton : elle reste toujours dépliée
      if (bouton !== null) {
        grilles[i].dataset.expanded = "false";
      }

      applyVisibility(grilles[i]);
      updateSeeMoreButton(grilles[i].id);
    }
  });
}


// ------------------------------------------------------------
// 5. Modale des détails d'un film
// ------------------------------------------------------------

const modale = document.getElementById("movie-modal-overlay");

async function openModal(id) {
  const film = await fetchMovieDetail(id);

  const image = document.getElementById("modal-image");
  image.src = film.image_url;
  image.alt = film.title;
  image.onerror = function () {
    image.src = imageParDefaut;
  };

  document.getElementById("modal-title").textContent = film.title;

  // Ligne 1 : 1998 - Comedy, Crime, Sport
  document.getElementById("modal-line-1").textContent = film.year + " - " + film.genres.join(", ");

  // Ligne 2 : PG-13 - 117 minutes (USA / UK)
  document.getElementById("modal-line-2").textContent =
    film.rated + " - " + film.duration + " minutes (" + film.countries.join(" / ") + ")";

  // Ligne 3 : IMDB score: 8.1/10
  document.getElementById("modal-line-3").textContent = "IMDB score: " + film.imdb_score + "/10";

  // Ligne 4 : recettes, en millions de dollars quand c'est possible (ex : $48.2m)
  let recettes = "Non renseignées";
  if (film.worldwide_gross_income !== null) {
    if (film.worldwide_gross_income >= 1000000) {
      recettes = "$" + (film.worldwide_gross_income / 1000000).toFixed(1) + "m";
    } else {
      recettes = "$" + film.worldwide_gross_income;
    }
  }
  document.getElementById("modal-line-4").textContent = "Recettes au box-office: " + recettes;

  document.getElementById("modal-director").textContent = film.directors.join(", ");
  document.getElementById("modal-actors").textContent = film.actors.join(", ");
  document.getElementById("modal-summary").textContent = film.long_description;

  modale.hidden = false;
}

function closeModal() {
  modale.hidden = true;
}

function initModal() {
  // Bouton "Détails" du meilleur film
  const boutonDetails = document.getElementById("best-movie-details-btn");
  boutonDetails.addEventListener("click", function () {
    openModal(boutonDetails.dataset.movieId);
  });

  // Boutons pour fermer
  document.getElementById("modal-close-btn").addEventListener("click", closeModal);
  document.getElementById("modal-close-btn-bottom").addEventListener("click", closeModal);

  // Clic en dehors de la fenêtre = fermeture
  modale.addEventListener("click", function (event) {
    if (event.target === modale) {
      closeModal();
    }
  });

  // Touche Echap = fermeture
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });
}


// ------------------------------------------------------------
// 6. Catégorie "Autres" (choisie par l'utilisateur)
// ------------------------------------------------------------

function initCategorySelect() {
  const select = document.getElementById("category-select");

  select.addEventListener("change", function () {
    const genre = select.value;
    const grille = document.getElementById("other-category-grid");

    // Pas de bouton "Voir plus" ici : on affiche tous les films de la catégorie
    grille.dataset.expanded = "true";

    if (genre !== "") {
      loadCategory("other-category-grid", genre);
    } else {
      grille.innerHTML = "";
    }
  });
}


// ------------------------------------------------------------
// 7. Lancement quand la page est chargée
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  initSeeMoreButtons();
  initModal();
  initCategorySelect();

  loadBestMovie();
  loadCategory("category-1-grid", "Mystery");
  loadCategory("category-2-grid", "Crime");
  loadGenresList();
});