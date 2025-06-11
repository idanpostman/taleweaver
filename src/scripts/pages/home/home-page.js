// home-page.js
import HomePresenter from '../../presenters/home/home-presenter.js';
import * as ApiService from '../../data/api.js';
import L from 'leaflet';
import Database from '../../data/database.js';

class HomePage {
  constructor() {
    this._presenter = new HomePresenter(this, ApiService);
    this._viewElement = null;
    this._storyListContainer = null;
    this._loadingIndicator = null;
    this._mapContainer = null;
    this._map = null;
    this._storiesWithLocation = [];
  }

  async render() {
    return `
      <div class="page-content-wrapper">
        <div class="home-container">
          <h2 class="home-title">Latest Stories from TaleWeaver</h2>
          <a href="#/add-story" class="add-story-button"><i class="fas fa-plus-circle"></i> Add New Story</a>
          <div id="loadingIndicator" class="loading-indicator" style="display:none;">Loading stories...</div>
          <div id="storyListContainer" class="story-list-container">
            </div>
          <div id="storyMapContainer" class="story-map-container" style="height: 400px; margin-top: 30px; background-color: #eee;">
            </div>
        </div>
      </div>
    `;
  }

  async afterRender(viewElement) {
    console.log('HomePage afterRender started.');
    this._viewElement = viewElement;
    this._storyListContainer = this._viewElement.querySelector(
      '#storyListContainer'
    );
    this._loadingIndicator =
      this._viewElement.querySelector('#loadingIndicator');
    this._mapContainer = this._viewElement.querySelector('#storyMapContainer');

    try {
      this.showLoading();
      console.log(
        'HomePage: Attempting to fetch stories from API via presenter...'
      );
      const storiesFromApi = await this._presenter.displayInitialData();
      console.log(
        'HomePage: Data received from presenter (API):',
        storiesFromApi
      );

      if (storiesFromApi && storiesFromApi.length > 0) {
        console.log(
          'HomePage: API returned data. Displaying stories from API.'
        );
        this.displayStories(storiesFromApi); 
        this._storiesWithLocation = storiesFromApi.filter(
          (story) => story.lat && story.lon
        );
        if (this._storiesWithLocation.length > 0) {
          this.initMap(this._storiesWithLocation);
        } else {
          this.initMap([]);
          console.log(
            'HomePage: No stories from API have location data for the map.'
          );
        }
      } else {
        console.warn(
          'HomePage: No data from API or API returned empty/error. Trying to load from IndexedDB.'
        );
        const localStories = await Database.getAllStories();
        console.log(
          'HomePage: Local stories retrieved from IndexedDB:',
          localStories
        );
        if (localStories && localStories.length > 0) {
          console.log('HomePage: Displaying stories from IndexedDB.');
          this.displayStories(localStories);
          this._storiesWithLocation = localStories.filter(
            (story) => story.lat && story.lon
          );
          if (this._storiesWithLocation.length > 0) {
            this.initMap(this._storiesWithLocation);
          } else {
            this.initMap([]);
            console.log(
              'HomePage: No stories from IndexedDB have location data for the map.'
            );
          }
        } else {
          console.log(
            'HomePage: No stories available from API or local storage.'
          );
          this.showError('No stories available.');
          this.initMap([]);
        }
      }
    } catch (error) {
      console.error(
        'HomePage: General error in afterRender. Error object:',
        error
      );
      console.warn(
        'HomePage: Trying to load local stories due to general error...'
      );

      try {
        const localStories = await Database.getAllStories();
        console.log(
          'HomePage: Local stories retrieved from IndexedDB (after general error):',
          localStories
        );
        if (localStories && localStories.length > 0) {
          this.displayStories(localStories); // Panggil displayStories
          this._storiesWithLocation = localStories.filter(
            (story) => story.lat && story.lon
          );
          if (this._storiesWithLocation.length > 0) {
            this.initMap(this._storiesWithLocation);
          } else {
            this.initMap([]);
          }
        } else {
          console.log(
            'HomePage: Failed to load stories from API and no local stories found (after general error).'
          );
          this.showError(
            'Failed to load stories. Please check your connection or try again later.'
          );
          this.initMap([]);
        }
      } catch (dbError) {
        console.error(
          'HomePage: Failed to load stories from IndexedDB as well (after general error):',
          dbError
        );
        this.showError(
          'Failed to load stories from both API and local storage.'
        );
        this.initMap([]);
      }
    } finally {
      this.hideLoading();
      console.log('HomePage: initial data loading process finished.');
    }
  }

  displayStories(stories) {
    if (!this._storyListContainer) {
      console.error('Story list container not found in displayStories.');
      return;
    }
    this._storyListContainer.innerHTML = '';
    if (!stories || stories.length === 0) {
      this._storyListContainer.innerHTML = '<p>No stories found.</p>';
      console.log('No stories to display.');
      return;
    }

    console.log(`HomePage: Displaying ${stories.length} stories.`);
    stories.forEach((story) => {
      const storyElement = document.createElement('article');
      storyElement.classList.add('story-item');
      const photoUrl =
        story.photoUrl || 'https://via.placeholder.com/150?text=No+Image';
      const name = story.name || 'Untitled Story';
      const description = story.description || 'No description available.';
      let createdAtText = 'Date unknown';
      if (story.createdAt) {
        try {
          createdAtText = new Date(story.createdAt).toLocaleDateString();
        } catch (e) {
          console.warn('Invalid createdAt date format:', story.createdAt);
        }
      }
      const id = story.id;

      storyElement.innerHTML = `
        <img src="${photoUrl}" alt="Story image for ${name}" class="story-image" onerror="this.onerror=null;this.src='https://via.placeholder.com/150?text=Image+Error';">
        <div class="story-content">
          <h3 class="story-name">${name}</h3>
          <p class="story-description">${description}</p>
          <p class="story-createdAt">Posted: ${createdAtText}</p>
          ${
            story.lat &&
            story.lon &&
            typeof story.lat === 'number' &&
            typeof story.lon === 'number'
              ? `<p class="story-location"><i class="fas fa-map-marker-alt"></i> Location: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</p>`
              : '<p class="story-location"><i class="fas fa-map-marker-alt"></i> Location not available</p>'
          }
          ${id ? `<button class="save-story-button" data-id="${id}" aria-label="Save this story locally"><i class="fas fa-bookmark"></i> Save Story</button>` : ''}
        </div>
      `;
      this._storyListContainer.appendChild(storyElement);
    });

    this._storyListContainer
      .querySelectorAll('.save-story-button')
      .forEach((button) => {
        button.addEventListener('click', async (event) => {
          const storyId = event.target.closest('button').dataset.id;
          const storyToSave = stories.find(story => story.id === storyId);
          
          if (storyToSave) {
            await this._handleSaveStory(storyToSave, button);
          }
        });
      });
  }

  async _handleSaveStory(story, buttonElement) {
    const originalText = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
      let photoBlob = null;
      if (story.photoUrl) {
        try {
          const response = await fetch(story.photoUrl);
          if (response.ok) {
            photoBlob = await response.blob();
          }
        } catch (error) {
          console.warn('Could not fetch photo for local storage:', error);
        }
      }

      const storyDataForDb = {
        description: story.description || story.name,
        photo: photoBlob,
        photoUrl: story.photoUrl,
        name: story.name,
        lat: story.lat,
        lon: story.lon,
        createdAt: story.createdAt || new Date().toISOString(),
        synced: true,
        originalId: story.id
      };

      await Database.saveStory(storyDataForDb);
      
      buttonElement.innerHTML = '<i class="fas fa-check"></i> Saved!';
      buttonElement.classList.add('saved');
      
      setTimeout(() => {
        buttonElement.innerHTML = '<i class="fas fa-bookmark-solid"></i> Saved';
        buttonElement.disabled = true;
      }, 2000);

      console.log(`Story "${story.name}" saved successfully to local storage.`);
    } catch (error) {
      console.error('Failed to save story:', error);
      buttonElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
      setTimeout(() => {
        buttonElement.innerHTML = originalText;
        buttonElement.disabled = false;
      }, 3000);
    }
  }

  initMap(storiesWithLocation) {
    this._storiesWithLocation = storiesWithLocation || [];

    if (!this._mapContainer) {
      console.error(
        'Map container (#storyMapContainer) not found for Home page.'
      );
      return;
    }
    if (!L) {
      console.error('Leaflet library (L) not loaded for Home page.');
      if (this._mapContainer)
        this._mapContainer.innerHTML =
          '<p class="error-message">Map library could not be loaded.</p>';
      return;
    }

    console.log('HomePage: Initializing map...');
    if (this._map) {
      console.log('HomePage: Removing existing map instance.');
      this._map.off();
      this._map.remove();
      this._map = null;
    }

    const defaultLat = -6.2;
    const defaultLon = 106.816666;
    const defaultZoom = 6;

    const initialLat =
      this._storiesWithLocation &&
      this._storiesWithLocation.length > 0 &&
      typeof this._storiesWithLocation[0].lat === 'number'
        ? this._storiesWithLocation[0].lat
        : defaultLat;
    const initialLon =
      this._storiesWithLocation &&
      this._storiesWithLocation.length > 0 &&
      typeof this._storiesWithLocation[0].lon === 'number'
        ? this._storiesWithLocation[0].lon
        : defaultLon;
    const initialZoom =
      this._storiesWithLocation && this._storiesWithLocation.length > 0
        ? 10
        : defaultZoom;

    try {
      this._map = L.map(this._mapContainer).setView(
        [initialLat, initialLon],
        initialZoom
      );
      console.log(
        `HomePage: Map initialized with view: [${initialLat}, ${initialLon}], zoom: ${initialZoom}`
      );
    } catch (mapError) {
      console.error('HomePage: Error initializing Leaflet map:', mapError);
      if (this._mapContainer)
        this._mapContainer.innerHTML =
          '<p class="error-message">Map could not be initialized.</p>';
      return;
    }

    const mapTilerApiKey = 'C6oCy3aAIq0ECQNRl8FA';
    const isValidMapTilerKey =
      mapTilerApiKey &&
      mapTilerApiKey !== 'YOUR_MAPTILER_API_KEY_PLACEHOLDER' &&
      mapTilerApiKey.length > 5;

    const availableBaseMaps = {};
    let defaultLayerAdded = false;

    if (isValidMapTilerKey) {
      console.log('HomePage: Using MapTiler layers.');
      const streetsLayer = L.tileLayer(
        `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerApiKey}`,
        {
          attribution:
            '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
          maxZoom: 19,
        }
      );
      availableBaseMaps['Streets (MapTiler)'] = streetsLayer;
      streetsLayer.addTo(this._map);
      defaultLayerAdded = true;
    } else {
      console.warn(
        'HomePage: MapTiler API key is not valid or not provided. Falling back to OpenStreetMap.'
      );
    }

    const openStreetMapLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }
    );
    availableBaseMaps['OpenStreetMap'] = openStreetMapLayer;

    if (!defaultLayerAdded) {
      console.log('HomePage: Adding OpenStreetMap as default layer.');
      openStreetMapLayer.addTo(this._map);
    }

    L.control.layers(availableBaseMaps).addTo(this._map);
    console.log('HomePage: Base map layers added to map control.');

    if (this._storiesWithLocation && this._storiesWithLocation.length > 0) {
      console.log(
        `HomePage: Adding ${this._storiesWithLocation.length} story markers to the map.`
      );
      this._storiesWithLocation.forEach((story) => {
        if (
          story.lat &&
          story.lon &&
          typeof story.lat === 'number' &&
          typeof story.lon === 'number'
        ) {
          const marker = L.marker([story.lat, story.lon]).addTo(this._map);
          marker.bindPopup(
            `<b>${story.name || 'Unknown'}</b><br>${story.description || 'No description.'}<br><img src="${story.photoUrl || '#'}" alt="${story.name || 'Unknown'}" width="50" onerror="this.style.display='none'">`
          );
        } else {
          console.warn(
            'HomePage: Story is missing valid lat/lon, cannot add marker:',
            story.name || story.id
          );
        }
      });
    } else {
      console.log(
        'HomePage: No stories with location data to display on the map.'
      );
      if (
        this._mapContainer &&
        !this._mapContainer.innerHTML.includes('error-message')
      ) {
        this._mapContainer.innerHTML =
          '<p>No story locations to display on map.</p>';
      }
    }
  }

  showLoading() {
    if (this._loadingIndicator) this._loadingIndicator.style.display = 'block';
    console.log('HomePage: Loading indicator shown.');
  }

  hideLoading() {
    if (this._loadingIndicator) this._loadingIndicator.style.display = 'none';
    console.log('HomePage: Loading indicator hidden.');
  }

  showError(message) {
    if (this._storyListContainer) {
      this._storyListContainer.innerHTML = `<p class="error-message">${message}</p>`;
    }
    if (
      this._mapContainer &&
      !this._mapContainer.innerHTML.includes('error-message')
    ) {
      this._mapContainer.innerHTML = `<p class="error-message">Could not load stories for map. ${message}</p>`;
    }
    console.error('HomePage: Error message displayed to user:', message);
  }

  getMapContainer() {
    return this._mapContainer;
  }

  navigateTo(hash) {
    console.log(`HomePage: Navigating to: ${hash}`);
    window.location.hash = hash;
  }

  async cleanup() {
    console.log('HomePage: Cleaning up...');
    if (this._map) {
      try {
        this._map.off();
        this._map.remove();
        console.log('HomePage: map instance removed.');
      } catch (e) {
        console.error('HomePage: Error removing map during cleanup:', e);
      }
      this._map = null;
    }
    this._viewElement = null;
    this._storyListContainer = null;
    this._loadingIndicator = null;
    this._mapContainer = null;
    this._storiesWithLocation = [];
    console.log('HomePage: cleanup finished.');
  }
}

export default HomePage;
