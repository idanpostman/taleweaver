import { openDB } from 'idb';

const DATABASE_NAME = 'taleweaver-db';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'stories';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade: (database) => {
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: 'id',
        autoIncrement: true,
      });
      console.log('Object store "stories" created.');
    }
  },
});

const Database = {
  async saveStory(story) {
    console.log('Attempting to save story to IndexedDB:', story);
    if (typeof story !== 'object' || story === null) {
      console.error('Validation failed: story must be an object.');
      throw new Error('Story data must be an object.');
    }
    if (
      !Object.hasOwn(story, 'description') ||
      !Object.hasOwn(story, 'photo')
    ) {
      console.error(
        'Validation failed: `description` and `photo` are required.'
      );
      throw new Error(
        '`description` and `photo` are required to save a story.'
      );
    }

    const storyToSave = {
      ...story,
      createdAt: story.createdAt || new Date().toISOString(),
    };

    if (storyToSave.id === null || typeof storyToSave.id === 'undefined') {
      delete storyToSave.id;
    }

    try {
      const db = await dbPromise;
      const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
      const store = tx.objectStore(OBJECT_STORE_NAME);
      const resultKey = await store.add(storyToSave);
      await tx.done;
      console.log('Story saved successfully to IndexedDB with key:', resultKey);
      return resultKey;
    } catch (error) {
      console.error('Failed to save story to IndexedDB:', error);
      if (error.name === 'ConstraintError') {
        console.error(
          'ConstraintError: This likely means a story with this ID already exists if an ID was provided.'
        );
      }
      throw error;
    }
  },

  async getAllStories() {
    console.log('Attempting to get all stories from IndexedDB...');
    try {
      const db = await dbPromise;
      const stories = await db.getAll(OBJECT_STORE_NAME);
      console.log('Stories retrieved from IndexedDB:', stories);
      return stories;
    } catch (error) {
      console.error('Failed to get all stories from IndexedDB:', error);
      throw error;
    }
  },

  async deleteStory(id) {
    console.log(`Attempting to delete story with ID: ${id} from IndexedDB...`);
    if (id === null || typeof id === 'undefined') {
      console.error(
        'Deletion failed: `id` is required and cannot be null or undefined.'
      );
      throw new Error('`id` is required to delete a story.');
    }
    try {
      const db = await dbPromise;
      const keyToDelete = Number(id);
      if (Number.isNaN(keyToDelete)) {
        console.error(
          `Deletion failed: Provided ID "${id}" is not a valid number.`
        );
        throw new Error(
          `Provided ID "${id}" is not a valid number for deletion.`
        );
      }
      await db.delete(OBJECT_STORE_NAME, keyToDelete);
      await db.transaction(OBJECT_STORE_NAME, 'readwrite').done;
      console.log(
        `Story with ID: ${keyToDelete} successfully marked for deletion from IndexedDB.`
      );
    } catch (error) {
      console.error(
        `Failed to delete story with ID: ${id} from IndexedDB:`,
        error
      );
      throw error;
    }
  },
  
};

export default Database;
