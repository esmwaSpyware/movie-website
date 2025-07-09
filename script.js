// script.js

// TMDb API Key (replace with your own key)
const API_KEY = 'abccd476094a5465d2a885e0c3d6b2b5';

// Current page for pagination
let currentPageMovies = 1;
let currentPageSeries = 1;

// Function to fetch movies from TMDb API
async function fetchMovies(page) {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching movies:', error);
        return [];
    }
}

// Function to fetch TV series from TMDb API
async function fetchSeries(page) {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=${page}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Error fetching series:', error);
        return [];
    }
}

// Function to fetch genres from TMDb API
async function fetchGenres() {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${API_KEY}&language=en-US`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.genres;
    } catch (error) {
        console.error('Error fetching genres:', error);
        return [];
    }
}

// Function to populate the genre dropdown
async function populateGenreDropdown() {
    const genreFilter = document.getElementById('genre-filter');
    if (!genreFilter) return;

    const genres = await fetchGenres();
    genres.forEach((genre) => {
        const option = document.createElement('option');
        option.value = genre.id;
        option.textContent = genre.name;
        genreFilter.appendChild(option);
    });
}

// Function to fetch streaming providers for a movie or series
async function fetchStreamingProviders(itemId, type) {
    const url = type === 'movie'
        ? `https://api.themoviedb.org/3/movie/${itemId}/watch/providers?api_key=${API_KEY}`
        : `https://api.themoviedb.org/3/tv/${itemId}/watch/providers?api_key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results || {};
    } catch (error) {
        console.error('Error fetching streaming providers:', error);
        return {};
    }
}

// Function to display items in a grid
function displayItems(items, containerId, type) {
    const container = document.querySelector(`#${containerId}`);
    if (!container) {
        console.error(`Container with ID "${containerId}" not found!`);
        return;
    }

    container.innerHTML = ''; // Clear previous results

    items.forEach(async (item) => {
        const posterPath = `https://image.tmdb.org/t/p/w500${item.poster_path}`;
        const card = document.createElement('div');
        card.id = `${type}-${item.id}`;
        card.classList.add('item-card');

        card.innerHTML = `
            <img src="${posterPath}" alt="${item.name || item.title}">
            <div class="card-info">
                <h3>${item.name || item.title}</h3>
                <p>Rating: ${item.vote_average}/10</p>
                <div class="streaming-links"></div>
                <div class="reviews">
                    <h4>User Reviews:</h4>
                    <ul id="review-list"></ul>
                    <form id="review-form">
                        <input type="text" id="review-input" placeholder="Write a review..." required>
                        <button type="submit">Submit</button>
                    </form>
                </div>
            </div>
        `;

        container.appendChild(card);

        setTimeout(async () => {
            const providers = await fetchStreamingProviders(item.id, type);
            displayLimitedStreamingLinks(`${type}-${item.id}`, providers);

            const reviews = JSON.parse(localStorage.getItem(`reviews-${item.id}`)) || [];
            displayReviews(`${type}-${item.id}`, reviews);
        }, 0);
    });
}

// Function to display limited streaming links with "View All" option
function displayLimitedStreamingLinks(itemId, providers) {
    const streamingContainer = document.querySelector(`#${itemId} .streaming-links`);
    if (!streamingContainer) {
        console.warn(`Streaming container not found for item ID: ${itemId}`);
        return;
    }

    streamingContainer.innerHTML = ''; // Clear previous links

    let allLinks = [];
    Object.values(providers).forEach((country) => {
        country.flatrate?.forEach((provider) => {
            if (provider.link) {
                const link = document.createElement('a');
                link.href = provider.link;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.textContent = provider.provider_name;
                allLinks.push(link);
            }
        });
    });

    const limitedLinks = allLinks.slice(0, 3);
    if (limitedLinks.length === 0) {
        const noLinksMessage = document.createElement('p');
        noLinksMessage.textContent = 'No streaming options available.';
        streamingContainer.appendChild(noLinksMessage);
    } else {
        limitedLinks.forEach((link) => streamingContainer.appendChild(link));
    }

    if (allLinks.length > 3) {
        const viewAllLink = document.createElement('span');
        viewAllLink.textContent = 'View All Providers';
        viewAllLink.classList.add('view-all-link');
        viewAllLink.addEventListener('click', () => {
            alert(allLinks.map(link => link.textContent).join(', '));
        });
        streamingContainer.appendChild(viewAllLink);
    }
}

// Function to handle user reviews
function displayReviews(itemId, reviews) {
    const reviewList = document.querySelector(`#${itemId} .reviews ul`);
    if (!reviewList) return;

    reviewList.innerHTML = ''; // Clear previous reviews

    reviews.forEach((review) => {
        const li = document.createElement('li');
        li.textContent = review;
        reviewList.appendChild(li);
    });
}

function saveReview(itemId, reviewText) {
    let reviews = JSON.parse(localStorage.getItem(`reviews-${itemId.split('-')[1]}`)) || [];
    reviews.push(reviewText);
    localStorage.setItem(`reviews-${itemId.split('-')[1]}`, JSON.stringify(reviews));
    return reviews;
}

document.body.addEventListener('submit', (e) => {
    if (e.target.id === 'review-form') {
        e.preventDefault();
        const itemId = e.target.closest('.item-card')?.id;
        if (!itemId) return;

        const reviewInput = e.target.querySelector('#review-input');
        const reviewText = reviewInput.value.trim();

        if (reviewText) {
            const reviews = saveReview(itemId, reviewText);
            displayReviews(itemId, reviews);
            reviewInput.value = ''; // Clear input field
        }
    }
});

// Load movies for the current page
async function loadMovies(page) {
    const movies = await fetchMovies(page);
    if (movies.length > 0) {
        displayItems(movies, 'movie-grid', 'movie');
    } else {
        const container = document.querySelector('#movie-grid');
        container.innerHTML = '<p>No popular movies found.</p>';
    }
}

// Load series for the current page
async function loadSeries(page) {
    const series = await fetchSeries(page);
    if (series.length > 0) {
        displayItems(series, 'series-grid', 'series');
    } else {
        const container = document.querySelector('#series-grid');
        container.innerHTML = '<p>No popular series found.</p>';
    }
}

// Apply Filters
document.getElementById('apply-filters')?.addEventListener('click', async () => {
    const genreId = document.getElementById('genre-filter').value || '';
    const releaseYear = document.getElementById('year-filter').value.trim() || '';
    const language = document.getElementById('language-filter').value || '';

    // Build query parameters for movies
    const movieQueryParams = new URLSearchParams();
    if (genreId) movieQueryParams.set('with_genres', genreId);
    if (releaseYear) movieQueryParams.set('primary_release_year', releaseYear); // For movies
    if (language) movieQueryParams.set('with_original_language', language);

    // Build query parameters for series
    const seriesQueryParams = new URLSearchParams();
    if (genreId) seriesQueryParams.set('with_genres', genreId);
    if (releaseYear) seriesQueryParams.set('first_air_date_year', releaseYear); // For series
    if (language) seriesQueryParams.set('with_original_language', language);

    try {
        // Fetch filtered movies
        const filteredMoviesResponse = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=en-US&${movieQueryParams.toString()}`
        );
        const filteredMoviesData = await filteredMoviesResponse.json();

        // Fetch filtered series
        const filteredSeriesResponse = await fetch(
            `https://api.themoviedb.org/3/discover/tv?api_key=${API_KEY}&language=en-US&${seriesQueryParams.toString()}`
        );
        const filteredSeriesData = await filteredSeriesResponse.json();

        // Display filtered results
        displayItems(filteredMoviesData.results, 'movie-grid', 'movie');
        displayItems(filteredSeriesData.results, 'series-grid', 'series');
    } catch (error) {
        console.error('Error applying filters:', error);
    }
});

// Clear Filters
document.getElementById('clear-filters')?.addEventListener('click', () => {
    // Reset filter inputs
    document.getElementById('genre-filter').value = ''; // Clear genre selection
    document.getElementById('year-filter').value = ''; // Clear year input
    document.getElementById('language-filter').value = ''; // Clear language selection

    // Reload default movies and series
    loadMovies(currentPageMovies); // Reload movies
    loadSeries(currentPageSeries); // Reload series
});

// Pagination logic for Movies
document.addEventListener('DOMContentLoaded', () => {
    const paginationContainerMovies = document.querySelector('#movies + .pagination');
    if (!paginationContainerMovies) {
        console.error('Pagination container for movies not found!');
        return;
    }

    const prevBtnMovies = document.createElement('button');
    prevBtnMovies.textContent = 'Previous';
    prevBtnMovies.id = 'prev-btn-movies';
    prevBtnMovies.disabled = true;

    const nextBtnMovies = document.createElement('button');
    nextBtnMovies.textContent = 'Next';
    nextBtnMovies.id = 'next-btn-movies';

    paginationContainerMovies.appendChild(prevBtnMovies);
    paginationContainerMovies.appendChild(nextBtnMovies);

    prevBtnMovies.addEventListener('click', () => {
        if (currentPageMovies > 1) {
            currentPageMovies--;
            loadMovies(currentPageMovies);
            updatePaginationButtonsMovies();
        }
    });

    nextBtnMovies.addEventListener('click', async () => {
        const totalResultsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const totalResultsData = await totalResultsResponse.json();
        const totalPages = Math.ceil(totalResultsData.total_results / 20);

        if (currentPageMovies < totalPages) {
            currentPageMovies++;
            loadMovies(currentPageMovies);
            updatePaginationButtonsMovies();
        }
    });

    async function updatePaginationButtonsMovies() {
        const prevBtn = document.getElementById('prev-btn-movies');
        const nextBtn = document.getElementById('next-btn-movies');

        if (currentPageMovies === 1) {
            prevBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
        }

        const totalResultsResponse = await fetch(
            `https://api.themoviedb.org/3/movie/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const totalResultsData = await totalResultsResponse.json();
        const totalPages = Math.ceil(totalResultsData.total_results / 20);

        if (currentPageMovies >= totalPages) {
            nextBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
        }
    }

    loadMovies(currentPageMovies);
});

// Pagination logic for Series
document.addEventListener('DOMContentLoaded', () => {
    const paginationContainerSeries = document.querySelector('#series + .pagination');
    if (!paginationContainerSeries) {
        console.error('Pagination container for series not found!');
        return;
    }

    const prevBtnSeries = document.createElement('button');
    prevBtnSeries.textContent = 'Previous';
    prevBtnSeries.id = 'prev-btn-series';
    prevBtnSeries.disabled = true;

    const nextBtnSeries = document.createElement('button');
    nextBtnSeries.textContent = 'Next';
    nextBtnSeries.id = 'next-btn-series';

    paginationContainerSeries.appendChild(prevBtnSeries);
    paginationContainerSeries.appendChild(nextBtnSeries);

    prevBtnSeries.addEventListener('click', () => {
        if (currentPageSeries > 1) {
            currentPageSeries--;
            loadSeries(currentPageSeries);
            updatePaginationButtonsSeries();
        }
    });

    nextBtnSeries.addEventListener('click', async () => {
        const totalResultsResponse = await fetch(
            `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const totalResultsData = await totalResultsResponse.json();
        const totalPages = Math.ceil(totalResultsData.total_results / 20);

        if (currentPageSeries < totalPages) {
            currentPageSeries++;
            loadSeries(currentPageSeries);
            updatePaginationButtonsSeries();
        }
    });

    async function updatePaginationButtonsSeries() {
        const prevBtn = document.getElementById('prev-btn-series');
        const nextBtn = document.getElementById('next-btn-series');

        if (currentPageSeries === 1) {
            prevBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
        }

        const totalResultsResponse = await fetch(
            `https://api.themoviedb.org/3/tv/popular?api_key=${API_KEY}&language=en-US&page=1`
        );
        const totalResultsData = await totalResultsResponse.json();
        const totalPages = Math.ceil(totalResultsData.total_results / 20);

        if (currentPageSeries >= totalPages) {
            nextBtn.disabled = true;
        } else {
            nextBtn.disabled = false;
        }
    }

    loadSeries(currentPageSeries);
});

// Search functionality
document.getElementById('search-btn')?.addEventListener('click', async () => {
    const query = document.getElementById('search-input')?.value?.trim();
    if (!query) return;

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const filteredResults = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');

        displayItems(filteredResults.filter(item => item.media_type === 'movie'), 'movie-grid', 'movie');
        displayItems(filteredResults.filter(item => item.media_type === 'tv'), 'series-grid', 'series');
    } catch (error) {
        console.error('Error searching:', error);
    }
});

// Initialize genre dropdown
document.addEventListener('DOMContentLoaded', () => {
    populateGenreDropdown();
});