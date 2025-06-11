import * as ApiService from '../../data/api.js'; 
import L from 'leaflet';
import Database from '../../data/database.js';

class AddStoryPage {
  constructor() {
    this._viewElement = null;
    this._previewImageElement = null;
    this._photoFile = null;
    this._map = null;
    this._selectedLat = null;
    this._selectedLon = null;
    this._mapContainer = null;
    this._cameraStream = null;
    this._currentMarker = null;
  }

  async render() {
    return `
      <div class="page-content-wrapper">
        <div class="add-story-container">
          <h2>Add New Tale</h2>
          <form id="addStoryForm" novalidate>
            <div class="form-group">
              <label for="storyDescription">Description:</label>
              <textarea id="storyDescription" name="description" rows="4" required></textarea>
            </div>

            <div class="form-group">
              <label for="storyPhoto">Photo (Upload or Use Camera):</label>
              <input type="file" id="storyPhoto" name="photo" accept="image/*">
              <button type="button" id="openCameraButton" class="camera-button"><i class="fas fa-camera"></i> Open Camera</button>
              
              <div id="cameraFeedContainer" style="display:none; margin-top:10px;">
                <video id="cameraFeed" autoplay playsinline></video>
                <div class="camera-action-buttons"> 
                  <button type="button" id="capturePhotoButton" class="capture-button" style="display:none;"><i class="fas fa-camera-retro"></i> Capture Photo</button>
                  <button type="button" id="closeCameraButton" class="close-camera-button" style="display:none;"><i class="fas fa-times-circle"></i> Close Camera</button>
                </div>
              </div>
              <img id="previewImage" src="#" alt="Image Preview" style="display:none; max-width: 100%; height: auto; margin-top: 10px; border: 1px solid #ddd;"/>
            </div>

            <div class="form-group">
              <p id="locationLabel">Location (Optional): Click on the map to select location.</p>
              <div id="addStoryMapContainer" class="story-map-container" aria-labelledby="locationLabel" role="application" aria-roledescription="interactive map"></div>
              
              <label for="storyLatitude" class="sr-only">Selected Latitude</label>
              <input type="text" id="storyLatitude" name="latitude" placeholder="Latitude" readonly style="margin-top:5px; width:48%; display:inline-block;" aria-describedby="locationLabel">
              
              <label for="storyLongitude" class="sr-only">Selected Longitude</label>
              <input type="text" id="storyLongitude" name="longitude" placeholder="Longitude" readonly style="margin-top:5px; width:48%; display:inline-block; float:right;" aria-describedby="locationLabel">
            </div>
            <button type="submit" id="submitStoryButton"><i class="fas fa-paper-plane"></i> Post Tale</button>
          </form>
          <div id="addStorySuccessMessage" class="success-message" style="display:none;"></div>
          <div id="addStoryErrorMessage" class="error-message" style="display:none;"></div>
        </div>
      </div>
    `;
  }

  async afterRender(viewElement) {
    this._viewElement = viewElement;
    this._previewImageElement =
      this._viewElement.querySelector('#previewImage');
    this._mapContainer = this._viewElement.querySelector(
      '#addStoryMapContainer'
    );

    const addStoryForm = this._viewElement.querySelector('#addStoryForm');
    const storyPhotoInput = this._viewElement.querySelector('#storyPhoto');
    const submitButton = this._viewElement.querySelector('#submitStoryButton');
    const openCameraButton =
      this._viewElement.querySelector('#openCameraButton');
    const cameraFeedContainer = this._viewElement.querySelector(
      '#cameraFeedContainer'
    );
    const cameraFeed = this._viewElement.querySelector('#cameraFeed');
    const capturePhotoButton = this._viewElement.querySelector(
      '#capturePhotoButton'
    );
    const closeCameraButton =
      this._viewElement.querySelector('#closeCameraButton');

    storyPhotoInput.addEventListener('change', (event) => {
      this._handleFileUpload(event);
    });

    openCameraButton.addEventListener('click', () => {
      this._openCamera(
        cameraFeedContainer,
        cameraFeed,
        capturePhotoButton,
        closeCameraButton,
        openCameraButton,
        storyPhotoInput
      );
    });

    capturePhotoButton.addEventListener('click', () => {
      this._capturePhoto(cameraFeed);
    });

    closeCameraButton.addEventListener('click', () => {
      this._closeCamera(
        cameraFeedContainer,
        cameraFeed,
        capturePhotoButton,
        closeCameraButton,
        openCameraButton
      );
    });

    addStoryForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      console.log('AddStoryPage: Form submitted.');

      const descriptionInput =
        this._viewElement.querySelector('#storyDescription');
      const description = descriptionInput.value.trim();

      if (!description || !this._photoFile) {
        this.showError('Both description and photo are required.');
        console.warn(
          'AddStoryPage: Validation failed - Description or photo missing.'
        );
        if (!description) descriptionInput.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Posting...';
      this.showError('');
      this.showSuccess('');

      try {
        console.log('AddStoryPage: Attempting to send story to API...');
        const apiResponse = await ApiService.addNewStory(
          description,
          this._photoFile,
          this._selectedLat,
          this._selectedLon
        );
        if (apiResponse && !apiResponse.error) {
          this.showSuccess('Story posted to server successfully!');
          this.clearForm();
          setTimeout(() => {
            this.navigateTo('#/');
          }, 2000);
        } else {
          const apiErrorMessage =
            apiResponse && apiResponse.message
              ? apiResponse.message
              : 'Unknown API error';
          this.showError(`Failed to post story to server: ${apiErrorMessage}`);
          console.error(
            'AddStoryPage: API returned an error:',
            apiErrorMessage
          );
        }
      } catch (error) {
        console.error('AddStoryPage: Error sending story to API:', error);
        this.showError(`Error posting story to server: ${error.message}`);
      } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Post Tale';
      }
    });

    this._initMapForAddingStory();
  }

  _initMapForAddingStory() {
    if (!this._mapContainer || !L) {
      console.error(
        'Map container for add story not found or Leaflet not loaded.'
      );
      if (this._mapContainer)
        this._mapContainer.innerHTML =
          '<p class="error-message">Map functionality is unavailable.</p>';
      return;
    }

    if (this._map) {
      console.log('Removing existing map instance for add story page.');
      this._map.off();
      this._map.remove();
      this._map = null;
    }

    console.log('Initializing map for adding story...');
    this._map = L.map(this._mapContainer).setView([-6.2, 106.816666], 10);

    const mapTilerApiKey = 'C6oCy3aAIq0ECQNRl8FA';
    const isValidMapTilerKey =
      mapTilerApiKey &&
      mapTilerApiKey !== 'YOUR_MAPTILER_API_KEY_PLACEHOLDER' &&
      mapTilerApiKey.length > 5;

    const availableBaseMaps = {};
    let defaultLayerAdded = false;

    if (isValidMapTilerKey) {
      console.log('Using MapTiler layers.');
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
        'MapTiler API key is not valid or not provided. Falling back to OpenStreetMap.'
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
      console.log('Adding OpenStreetMap as default layer.');
      openStreetMapLayer.addTo(this._map);
    }

    L.control.layers(availableBaseMaps).addTo(this._map);

    this._map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      console.log(`Map clicked at Lat: ${lat}, Lng: ${lng}`);
      this.setSelectedLocation(lat, lng);
      if (this._currentMarker) {
        this._map.removeLayer(this._currentMarker);
      }
      this._currentMarker = L.marker([lat, lng]).addTo(this._map);
      this._currentMarker
        .bindPopup(`Selected Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        .openPopup();
    });

    if (navigator.geolocation) {
      console.log(
        'Attempting to get user current location for map initial view.'
      );
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          console.log(
            `User location obtained: Lat: ${userLat}, Lng: ${userLng}. Setting map view.`
          );
          this._map.setView([userLat, userLng], 13);
        },
        (error) => {
          console.warn(
            'Could not get user location for Add Story map. Error:',
            error.message
          );
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser.');
    }
  }

  _handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
      console.log('File selected for upload:', file.name);
      this._photoFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this._previewImageElement) {
          this._previewImageElement.src = e.target.result;
          this._previewImageElement.style.display = 'block';
          console.log('Image preview updated.');
        }
      };
      reader.readAsDataURL(file);
      this._closeCameraIfNeeded();
    } else {
      console.log('No file selected for upload.');
    }
  }

  async _openCamera(
    container,
    videoEl,
    captureBtn,
    closeBtn,
    openBtn,
    storyPhotoInput
  ) {
    console.log('Attempting to open camera...');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        this._closeCameraIfNeeded();
        this._cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        videoEl.srcObject = this._cameraStream;
        container.style.display = 'block';
        captureBtn.style.display = 'inline-block';
        closeBtn.style.display = 'inline-block';
        openBtn.style.display = 'none';
        if (this._previewImageElement)
          this._previewImageElement.style.display = 'none';
        if (storyPhotoInput) storyPhotoInput.value = '';
        this._photoFile = null;
        console.log('Camera opened successfully.');
      } catch (error) {
        console.error('Error accessing camera: ', error);
        this.showError(
          'Could not access camera. Ensure permissions are granted and try again.'
        );
      }
    } else {
      console.warn('Camera API (getUserMedia) not supported by this browser.');
      this.showError('Camera API not supported by this browser.');
    }
  }

  _capturePhoto(videoEl) {
    console.log('Attempting to capture photo from camera stream...');
    if (
      !videoEl ||
      !videoEl.videoWidth ||
      !videoEl.videoHeight ||
      !this._cameraStream
    ) {
      console.error(
        'Video element not ready or camera stream not active for capture.'
      );
      this.showError('Camera not ready or stream inactive. Please try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    if (this._previewImageElement) {
      this._previewImageElement.src = canvas.toDataURL('image/png');
      this._previewImageElement.style.display = 'block';
      console.log('Photo captured and preview updated.');
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `capture_${Date.now()}.png`;
        this._photoFile = new File([blob], fileName, { type: 'image/png' });
        console.log(
          'Photo captured and stored as File object:',
          this._photoFile
        );
      } else {
        console.error('Failed to create blob from canvas.');
        this.showError('Failed to process captured image.');
      }
    }, 'image/png');

    this._closeCameraIfNeeded();
  }

  _closeCamera(container, videoEl, captureBtn, closeBtn, openBtn) {
    console.log('Closing camera manually...');
    if (this._cameraStream) {
      this._cameraStream.getTracks().forEach((track) => track.stop());
      console.log('Camera stream tracks stopped.');
    }
    if (videoEl) videoEl.srcObject = null;
    if (container) container.style.display = 'none';
    if (captureBtn) captureBtn.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    if (openBtn) openBtn.style.display = 'inline-block';
    this._cameraStream = null;
    console.log('Camera closed and UI reset.');
  }

  _closeCameraIfNeeded() {
    if (this._cameraStream) {
      console.log(
        'Closing camera because another input method was used or page is cleaning up...'
      );
      this._cameraStream.getTracks().forEach((track) => track.stop());
      this._cameraStream = null;
      console.log('Camera stream tracks stopped (internally).');

      if (this._viewElement) {
        const container = this._viewElement.querySelector(
          '#cameraFeedContainer'
        );
        const videoEl = this._viewElement.querySelector('#cameraFeed');
        const captureBtn = this._viewElement.querySelector(
          '#capturePhotoButton'
        );
        const closeBtn = this._viewElement.querySelector('#closeCameraButton');
        const openBtn = this._viewElement.querySelector('#openCameraButton');

        if (videoEl) videoEl.srcObject = null;
        if (container) container.style.display = 'none';
        if (captureBtn) captureBtn.style.display = 'none';
        if (closeBtn) closeBtn.style.display = 'none';
        if (openBtn) openBtn.style.display = 'inline-block';
        console.log('Camera UI reset (internally).');
      }
    }
  }

  async cleanup() {
    console.log('Cleaning up AddStoryPage...');
    this._closeCameraIfNeeded();

    if (this._map) {
      try {
        this._map.off();
        this._map.remove();
        console.log('AddStoryPage map instance removed.');
      } catch (e) {
        console.error('Error removing map during AddStoryPage cleanup:', e);
      }
      this._map = null;
    }
    this._viewElement = null;
    this._previewImageElement = null;
    this._mapContainer = null;
    this._photoFile = null;
    this._selectedLat = null;
    this._selectedLon = null;
    this._currentMarker = null;
    console.log('AddStoryPage cleanup finished.');
  }

  setSelectedLocation(lat, lon) {
    this._selectedLat = lat;
    this._selectedLon = lon;
    if (this._viewElement) {
      const latInput = this._viewElement.querySelector('#storyLatitude');
      const lonInput = this._viewElement.querySelector('#storyLongitude');
      if (latInput) latInput.value = lat.toFixed(6);
      if (lonInput) lonInput.value = lon.toFixed(6);
    }
  }

  showSuccess(message) {
    if (!this._viewElement) return;
    const successMessageElement = this._viewElement.querySelector(
      '#addStorySuccessMessage'
    );
    const errorMessageElement = this._viewElement.querySelector(
      '#addStoryErrorMessage'
    );
    if (successMessageElement) {
      successMessageElement.textContent = message;
      successMessageElement.style.display = 'block';
    }
    if (errorMessageElement) errorMessageElement.style.display = 'none';
  }

  showError(message) {
    if (!this._viewElement) return;
    const errorMessageElement = this._viewElement.querySelector(
      '#addStoryErrorMessage'
    );
    const successMessageElement = this._viewElement.querySelector(
      '#addStorySuccessMessage'
    );
    if (errorMessageElement) {
      errorMessageElement.textContent = message;
      errorMessageElement.style.display = 'block';
    }
    if (successMessageElement) successMessageElement.style.display = 'none';
  }

  clearForm() {
    if (this._viewElement) {
      this._viewElement.querySelector('#storyDescription').value = '';
      const storyPhotoInput = this._viewElement.querySelector('#storyPhoto');
      if (storyPhotoInput) storyPhotoInput.value = '';
      const latInput = this._viewElement.querySelector('#storyLatitude');
      const lonInput = this._viewElement.querySelector('#storyLongitude');
      if (latInput) latInput.value = '';
      if (lonInput) lonInput.value = '';
    }
    if (this._previewImageElement) {
      this._previewImageElement.src = '#';
      this._previewImageElement.style.display = 'none';
    }
    this._photoFile = null;
    this._selectedLat = null;
    this._selectedLon = null;

    this._closeCameraIfNeeded();

    if (this._map && this._currentMarker) {
      this._map.removeLayer(this._currentMarker);
      this._currentMarker = null;
    }
    console.log('Add story form cleared.');
  }

  navigateTo(hash) {
    console.log(`Navigating to: ${hash}`);
    window.location.hash = hash;
  }
}

export default AddStoryPage;
