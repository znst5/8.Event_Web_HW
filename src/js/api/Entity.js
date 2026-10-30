import createRequest from './createRequest.js';

export default class Entity {
    static async list(options = {}) {
        return createRequest({
            url: options.url,
            method: 'GET',
            data: options.data,
        });
    }

    static async get(options = {}) {
        return createRequest({
            url: options.url,
            method: 'GET',
            data: options.data,
        });
    }

    static async create(options = {}) {
        return createRequest({
            url: options.url,
            method: 'POST',
            data: options.data,
        });
    }

    static async update(options = {}) {
        return createRequest({
            url: options.url,
            method: 'PUT',
            data: options.data,
        });
    }

    static async delete(options = {}) {
        return createRequest({
            url: options.url,
            method: 'DELETE',
            data: options.data,
        });
    }
}
