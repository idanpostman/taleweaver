import Database from '../../data/database.js';

class MyTalePage {
  constructor() {
    this._viewElement = null;
    this._storyListContainer = null;
    this._loadingIndicator = null;
    this._objectUrls = new Set();
  }

  async render() {
    console.log('MyTalePage: render() called');
    return `
      <div class="page-content-wrapper my-tale-page-container">
        <div class="my-tale-content">
          <h2 class="my-tale-title">My Saved Tales</h2>
          <p class="my-tale-description">These are stories you have saved locally on this device. You can manage them here.</p>
          <div id="myTaleLoadingIndicator" class="loading-indicator" style="display:none;">Loading your tales...</div>
          <div id="myTaleStoryListContainer" class="story-list-container">
            {/* Cerita dari IndexedDB akan dimuat di sini */}
          </div>
        </div>
      </div>
    `;
  }

  async afterRender(viewElement) {
    console.log('MyTalePage: afterRender() called');
    this._viewElement = viewElement;
    this._storyListContainer = this._viewElement.querySelector(
      '#myTaleStoryListContainer'
    );
    this._loadingIndicator = this._viewElement.querySelector(
      '#myTaleLoadingIndicator'
    );

    if (this._loadingIndicator) this._loadingIndicator.style.display = 'block';

    this._revokeActiveObjectUrls();

    try {
      console.log('MyTalePage: Fetching stories from IndexedDB...');
      const localStories = await Database.getAllStories();
      console.log('MyTalePage: Stories from IndexedDB:', localStories);

      if (localStories && localStories.length > 0) {
        this.displayMyStories(localStories);
      } else {
        if (this._storyListContainer) {
          this._storyListContainer.innerHTML =
            '<p class="no-stories-message">You have no saved tales yet. <a href="#/add-story">Add your first tale!</a></p>';
        }
        console.log('MyTalePage: No local stories found.');
      }
    } catch (error) {
      console.error(
        'MyTalePage: Error fetching stories for My Tale page:',
        error
      );
      if (this._storyListContainer) {
        this._storyListContainer.innerHTML =
          '<p class="error-message">Oops! Something went wrong while loading your tales.</p>';
      }
    } finally {
      if (this._loadingIndicator) this._loadingIndicator.style.display = 'none';
      console.log('MyTalePage: Finished loading local stories.');
    }
  }

  displayMyStories(stories) {
    console.log(`MyTalePage: Displaying ${stories.length} stories.`);
    if (!this._storyListContainer) {
      console.error('MyTalePage: Story list container not found.');
      return;
    }
    this._storyListContainer.innerHTML = '';

    stories.forEach((story) => {
      const storyElement = document.createElement('article');
      storyElement.classList.add('story-item', 'my-tale-item');

      let photoDisplayUrl = 'https://via.placeholder.com/150?text=No+Image';
      if (story.photo && story.photo instanceof Blob) {
        try {
          photoDisplayUrl = URL.createObjectURL(story.photo);
          this._objectUrls.add(photoDisplayUrl);
        } catch (e) {
          console.error(
            'MyTalePage: Error creating object URL for photo blob:',
            e
          );
          photoDisplayUrl = 'https://via.placeholder.com/150?text=Image+Error';
        }
      } else if (story.photoUrl) {
        photoDisplayUrl = story.photoUrl;
      } else if (typeof story.photo === 'string') {
        console.warn(
          `MyTalePage: Story ID ${story.id} photo is a string (filename), cannot display directly. Using placeholder.`
        );
      }

      const description = story.description || 'No description available.';
      const id = story.id;

      let createdAtText = 'Date unknown';
      if (story.createdAt) {
        try {
          createdAtText = new Date(story.createdAt).toLocaleDateString(
            'id-ID',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          );
        } catch (e) {
          console.warn(
            'MyTalePage: Invalid createdAt date format:',
            story.createdAt
          );
          createdAtText = new Date(story.createdAt).toLocaleDateString();
        }
      }

      if (!id) {
        console.warn(
          'MyTalePage: Story from IndexedDB is missing an ID. Deletion might not work:',
          story
        );
      }

      storyElement.innerHTML = `
        <img src="${photoDisplayUrl}" alt="Locally saved tale" class="story-image my-tale-image" onerror="this.onerror=null;this.src='https://via.placeholder.com/150?text=Load+Error';">
        <div class="story-content my-tale-story-content">
          <p class="story-description my-tale-description">${description}</p>
          <p class="story-createdAt my-tale-createdAt">Saved: ${createdAtText}</p>
          ${
            story.lat &&
            story.lon &&
            typeof story.lat === 'number' &&
            typeof story.lon === 'number'
              ? `<p class="story-location my-tale-location"><i class="fas fa-map-marker-alt"></i> Location: ${story.lat.toFixed(4)}, ${story.lon.toFixed(4)}</p>`
              : ''
          }
          ${id ? `<button class="delete-story-button my-tale-delete-button" data-id="${id}" aria-label="Delete this tale"><i class="fas fa-trash-alt"></i> Delete</button>` : ''}
        </div>
      `;
      this._storyListContainer.appendChild(storyElement);
    });

    this._storyListContainer
      .querySelectorAll('.delete-story-button')
      .forEach((button) => {
        button.addEventListener('click', async (event) => {
          const storyId = event.target.closest('button').dataset.id;
          console.log(
            `MyTalePage: Delete button clicked for story ID: ${storyId}`
          );

          if (
            confirm(
              'Are you sure you want to permanently delete this tale from your saved stories?'
            )
          ) {
            if (this._loadingIndicator)
              this._loadingIndicator.style.display = 'block';
            try {
              await Database.deleteStory(storyId);
              alert('Tale deleted successfully from your saved stories!');
              console.log(
                `MyTalePage: Story ID ${storyId} successfully deleted from IndexedDB.`
              );
              await this.afterRender(this._viewElement);
            } catch (error) {
              console.error(
                `MyTalePage: Failed to delete story ID ${storyId}:`,
                error
              );
              alert('Failed to delete tale. Please try again.');
            } finally {
              if (this._loadingIndicator)
                this._loadingIndicator.style.display = 'none';
            }
          }
        });
      });
  }

  _revokeActiveObjectUrls() {
    if (this._objectUrls && this._objectUrls.size > 0) {
      console.log('MyTalePage: Revoking old object URLs:', this._objectUrls);
      this._objectUrls.forEach((url) => URL.revokeObjectURL(url));
      this._objectUrls.clear();
    }
  }

  async cleanup() {
    console.log('MyTalePage: cleanup() called');
    this._revokeActiveObjectUrls();
    this._viewElement = null;
    this._storyListContainer = null;
    this._loadingIndicator = null;
    this._objectUrls = new Set();
    console.log('MyTalePage: Cleanup finished.');
  }
}

export default MyTalePage;
