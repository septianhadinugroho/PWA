import CONFIG from '../../core/Config';

export class StoryModel {
    constructor() {
        this._baseUrl = CONFIG.BASE_URL;
    }

    async getStoriesWithLocation() {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${this._baseUrl}/stories?location=1`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        console.log('API Response:', data);

        return data.listStory.map(story => ({
            ...story,
            photoUrl: story.photoUrl ?
                story.photoUrl.startsWith('http') ?
                story.photoUrl :
                `${this._baseUrl}/${story.photoUrl}` :
                null
        }));
    }

    async postStory(token, {
        description,
        photo,
        lat,
        lon
    }) {
        const formData = new FormData();
        formData.append('description', description);
        formData.append('photo', photo);
        if (lat && lon) {
            formData.append('lat', lat);
            formData.append('lon', lon);
        }

        const response = await fetch(`${this._baseUrl}/stories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to post story');
        }

        return await response.json();
    }

    saveToLocalStorage(key, value) {
        localStorage.setItem(key, value);
    }

    getFromLocalStorage(key) {
        return localStorage.getItem(key);
    }

    removeFromLocalStorage(key) {
        localStorage.removeItem(key);
    }
}