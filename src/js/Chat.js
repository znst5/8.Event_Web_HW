import ChatAPI from "./api/ChatAPI.js";

export default class Chat {
    constructor(container) {
        this.container = container;
        this.api = new ChatAPI();
        this.websocket = null;
        this.currentUser = null;
    }

    init() {
        this.bindToDOM();
        this.registerEvents();
    }

    bindToDOM() {
        const htmlTemplate = `
        <div>
          <div class="modal__form">
            <div class="modal__background"></div>
            <div class="modal__content">
              <div class="modal__header">Выберите псевдоним</div>
              <div class="modal__body">
                <form class="form">
                  <div class="form__group">
                    <label class="form__label" for="username">Введите ваш никнейм:</label>
                    <input class="form__input" type="text" id="username" placeholder="Например, Иван">
                    <div class="form__hint"></div>
                  </div>
                </form>
              </div>
              <div class="modal__footer">
                <button class="modal__ok" type="button">OK</button>
              </div>
            </div>
          </div>
          <div class="container">
            <h1 class="chat__header">Анонимный Чат</h1>
            <div class="chat__container" style="display: flex; flex-direction: row; width: 90%; height: 550px; margin: 0 auto; border: 1px solid #e2e5e9; border-radius: 8px; box-shadow: 0 1px 3 px rgba(0,0,0,0.12);">
              <div class="chat_area" style="flex: 0 0 70%; display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
                <div class="chat__messages-container" style="display: flex; flex-direction: column; flex-grow: 1; height: 450px; overflow-y: auto; padding: 15px; box-sizing: border-box; gap: 10px;"></div>
                <div class="chat__messages-input" style="flex: 0 0 10%; padding: 10px; box-sizing: border-box; display: flex; align-items: center;">
                  <form class="chat__messages-form" style="margin: 0; padding: 0; width: 100%; display: flex;">
                      <input class="form__input form__input_message" type="text" placeholder="Напишите сообщение..." style="width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #e2e5e9; border-radius: 5px;">
                  </form>
                </div>
              </div>
              <div class="chat__userlist" style="flex: 0 0 30%; background-color: #edefec; border-top-right-radius: 7px; border-bottom-right-radius: 7px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; padding-top: 15px; overflow-y: auto;"></div>
            </div>
          </div>
        </div>
        `;

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlTemplate, 'text/html');
        const renderedUI = doc.body.firstChild;

        this.container.replaceChildren();
        this.container.appendChild(renderedUI);

        this.modal = document.querySelector('.modal__form');
        this.modalInput = document.querySelector('#username');
        this.modalHint = document.querySelector('.form__hint');
        this.modalSubmitBtn = document.querySelector('.modal__ok');

        this.chatContainer = document.querySelector('.chat__container');
        this.messagesContainer = document.querySelector('.chat__messages-container');
        this.messageInput = document.querySelector('.form__input_message');
        this.messagesForm = document.querySelector('.chat__messages-form');
        this.userListContainer = document.querySelector('.chat__userlist');

        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    registerEvents() {
        if (this.modalSubmitBtn) {
            this.modalSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.onEnterChatHandler();
            });
        }

        if (this.messagesForm) {
            this.messagesForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        window.addEventListener('beforeunload', () => {
            if (this.websocket && this.websocket.readyState === Websocket.OPEN && this.currentUser) {
                this.websocket.send(JSON.stringify({
                    type: 'exit',
                    user: this.currentUser
                }));
            }
        });
    }

    subscribeOnEvents() {
        if (!this.websocket) return;

        this.websocket.addEventListener('message', (e) => {
            console.log('WS сообщение от сервера получено:', e.data);
            const response = JSON.parse(e.data);

            if (response.type === 'message' && response.data) {
                this.renderMessage(response.data);
            } else if (response.type === 'send' || response.message) {
                this.renderMessage({
                    name: response.user ? response.user.name : response.name,
                    text: response.message || response.text,
                    dateTime: response.dateTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
            }

            if ((response.type === 'userlist' || response.users || Array.isArray(response)) && this.userListContainer) {
                const users = response.users || (Array.isArray(response) ? response: response.data);
                if (Array.isArray(users)) {
                    this.userListContainer.replaceChildren();

                    users.forEach(user => {
                        const userEl = document.createElement('div');
                        userEl.classList.add('chat__user');

                        if (user.name === this.currentUser) {
                            userEl.classList.add('chat__user-me');
                            userEl.textContent = 'You';
                        } else {
                            userEl.textContent = user.name;
                        }
                        this.userListContainer.appendChild(userEl);
                    }); 
                }
            }
        });

        this.websocket.addEventListener('close', () => {
            console.log('Соединение с сервером закрыто');
        });

        this.websocket.addEventListener('error', (err) => {
            console.error('Ошибка WebSocket:', err);
        });
    }

    async onEnterChatHandler() {
        const name = this.modalInput.value.trim();

        if (!name) {
            this.modalHint.textContent = 'Имя не должно быть пустым';
            return;
        }

        try {
            const response = await ChatAPI.registerUser(name);

            if (response && response.status === 'error') {
                this.modalHint.textContent = response.message || 'Этот ник уже занят!';
                return;
            }

            this.currentUser = name;
            this.modal.classList.remove('active');

            this.websocket = new WebSocket(process.env.WS_URL);

            this.websocket.addEventListener('open', () => {
                console.log('Успешно подключились к WS чата');
                this.websocket.send(JSON.stringify({
                    type: 'login',
                    name: this.currentUser
                }));
            });

            this.subscribeOnEvents();
        } catch (error) {
            this.modalHint.textContent = error.message || 'Не удалось подключиться к серверу.';
            console.error('Ошибка входа в чат:', error);
        }
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        const dateTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })


        const messageData = {
            type: 'message',
            name: this.currentUser,
            message: text,
            user: {
                name: this.currentUser
            },
            dateTime: dateTimeStr
        };

        this.renderMessage({
            name: this.currentUser,
            text: text,
            dateTime: dateTimeStr
        });

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(messageData));
        }

        this.messageInput.value = '';
    }

    renderMessage(message) {
        const { name, text, dateTime } = message;

        const messageEl = document.createElement('div');
        messageEl.classList.add('message__container');

        messageEl.style.display = 'flex';
        messageEl.style.flexDirection = 'column';
        messageEl.style.width = 'fit-content';
        messageEl.style.maxWidth = '70%';
        messageEl.style.marginBottom = '10px';

        const isMe = name === this.currentUser;

        if (isMe) {
            messageEl.classList.add('message__container-yourself');
            messageEl.style.marginLeft = 'auto';
        } else {
            messageEl.classList.add('message__container-interlocutor');
            messageEl.style.marginRight = 'auto';
        }

        const headerEl = document.createElement('div');
        headerEl.classList.add('message__header');
        headerEl.style.fontSize = '14px';

        const senderSpan = document.createElement('span');
        senderSpan.classList.add('message__sender');
        senderSpan.textContent = isMe ? 'You' : name;
        if (isMe) senderSpan.style.color = '#20b1df';

        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message__time');
        timeSpan.textContent = `, ${dateTime || ''}`;

        headerEl.appendChild(senderSpan);
        headerEl.appendChild(timeSpan);

        const textEl = document.createElement('div');
        textEl.classList.add('message__text');
        textEl.style.wordBreak = 'break-word';
        textEl.textContent = text;

        messageEl.appendChild(headerEl);
        messageEl.appendChild(textEl);
        this.messagesContainer.appendChild(messageEl);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}
