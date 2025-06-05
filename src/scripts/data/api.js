const BASE_URL = 'https://story-api.dicoding.dev/v1';

async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Registration failed:', error.message);
    throw error;
  }
}

async function loginUser(email, password) {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    localStorage.setItem('token', data.loginResult.token);
    localStorage.setItem('userName', data.loginResult.name);
    return data.loginResult;
  } catch (error) {
    console.error('Login failed:', error.message);
    throw error;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function getUserName() {
  return localStorage.getItem('userName');
}

function logoutUser() {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
}

async function fetchAllStories(page = 1, size = 10, location = 0) {
  const token = getToken();
  if (!token) {
    throw new Error('User not authenticated. Please login.');
  }
  try {
    const apiUrl = `${BASE_URL}/stories?page=${page}&size=${size}&location=${location}`;
    console.log('Fetching stories from (fetchAllStories):', apiUrl);
    console.log('Using token (fetchAllStories):', token);

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response Text (fetchAllStories):', errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}. Server says: ${errorText.substring(0, 200)}...`
      );
    }

    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data.listStory;
  } catch (error) {
    console.error('Could not fetch stories (fetchAllStories):', error.message);
    throw error;
  }
}

async function addNewStory(description, photo, lat, lon) {
  const token = getToken();
  if (!token) {
    throw new Error('User not authenticated. Please login.');
  }

  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', photo);
  if (lat !== undefined && lon !== undefined && lat !== null && lon !== null) {
    formData.append('lat', parseFloat(lat));
    formData.append('lon', parseFloat(lon));
  }

  try {
    const response = await fetch(`${BASE_URL}/stories`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Could not add new story:', error.message);
    throw error;
  }
}

async function fetchStoryDetail(storyId) {
  const token = getToken();
  if (!token) {
    throw new Error('User not authenticated. Please login.');
  }
  try {
    const apiUrl = `${BASE_URL}/stories/${storyId}`;
    console.log('Fetching story detail from:', apiUrl);
    console.log('Using token (fetchStoryDetail):', token);

    const response = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `API Error Response Text (fetchStoryDetail ${storyId}):`,
        errorText
      );
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}. Server says: ${errorText.substring(0, 200)}...`
      );
    }

    const data = await response.json();
    if (data.error) throw new Error(data.message);
    return data.story;
  } catch (error) {
    console.error(
      `Could not fetch detail for story ${storyId}:`,
      error.message
    );
    throw error;
  }
}

async function savePushSubscription(subscription) {
  const token = getToken();
  if (!token) {
    console.warn(
      'api.js - savePushSubscription: User not authenticated. Cannot save push subscription to server.'
    );
    throw new Error('User not authenticated to save push subscription.');
  }

  const PUSH_SUBSCRIPTION_ENDPOINT = `${BASE_URL}/notifications/subscribe`;

  const subscriptionToSend = subscription.toJSON();

  if (Object.hasOwn(subscriptionToSend, 'expirationTime')) {
    delete subscriptionToSend.expirationTime;
    console.log(
      'api.js - savePushSubscription: "expirationTime" field removed from subscription object.'
    );
  }

  console.log(
    'api.js - savePushSubscription: Endpoint:',
    PUSH_SUBSCRIPTION_ENDPOINT
  );
  console.log(
    'api.js - savePushSubscription: Sending subscription (modified):',
    JSON.stringify(subscriptionToSend)
  );

  try {
    const response = await fetch(PUSH_SUBSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscriptionToSend),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error(
        'api.js - savePushSubscription: Failed to send. Server response:',
        responseData
      );
      throw new Error(
        responseData.message ||
          `Failed to send push subscription to server: ${response.status}`
      );
    }

    console.log(
      'api.js - savePushSubscription: Push subscription sent to server successfully:',
      responseData
    );
    return responseData;
  } catch (error) {
    console.error(
      'api.js - savePushSubscription: Error sending push subscription to server: ',
      error
    );
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

async function removePushSubscriptionFromServer(subscriptionEndpoint) {
  const token = getToken();
  if (!token) {
    console.warn(
      'api.js - removePushSubscriptionFromServer: User not authenticated. Cannot remove push subscription.'
    );
    throw new Error('User not authenticated to remove push subscription.');
  }

  const UNSUBSCRIBE_ENDPOINT = `${BASE_URL}/notifications/subscribe`;
  console.log(
    'api.js - removePushSubscriptionFromServer: Endpoint:',
    UNSUBSCRIBE_ENDPOINT
  );
  console.log(
    'api.js - removePushSubscriptionFromServer: Removing with endpoint:',
    subscriptionEndpoint
  );

  try {
    const response = await fetch(UNSUBSCRIBE_ENDPOINT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ endpoint: subscriptionEndpoint }),
    });

    const responseData = await response.json();
    if (!response.ok) {
      console.error(
        'api.js - removePushSubscriptionFromServer: Failed to remove. Server response:',
        responseData
      );
      throw new Error(
        responseData.message ||
          `Failed to remove push subscription from server: ${response.status}`
      );
    }

    console.log(
      'api.js - removePushSubscriptionFromServer: Push subscription removed from server successfully:',
      responseData
    );
    return responseData;
  } catch (error) {
    console.error(
      'api.js - removePushSubscriptionFromServer: Error removing push subscription from server: ',
      error
    );
    if (error instanceof Error) throw error;
    throw new Error(String(error));
  }
}

export {
  registerUser,
  loginUser,
  getToken,
  getUserName,
  logoutUser,
  fetchAllStories,
  addNewStory,
  fetchStoryDetail,
  savePushSubscription,
  removePushSubscriptionFromServer,
};
