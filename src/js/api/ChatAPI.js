import Entity from './Entity.js';
import createRequest from './createRequest.js';

export default class ChatAPI extends Entity {
    static async registerUser(username) {
        return super.create({
            url: './new-user',
            data: { name: username }
        });
    }
}
