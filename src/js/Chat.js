import ChatAPI from "./api/ChatAPI.js";

export default class Chat {
    constructor(container) {
        this.container = container;
        this.api = null;
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
                <button class="modal__ok" type="submit">OK</button>
              </div>
            </div>
          </div>
          <div class="container">
            <h1 class="chat__header">Анонимный Чат</h1>
            <div class="chat__container">
              <div class="chat__userlist"></div>
              <div class="chat__area">
                <div class="chat__messages-container"></div>
                <div class="chat__messages-input">
                  <form class="chat__messages-form">
                      <input class="form__input form__input_message" type="text" placeholder="Напишите сообщение...">
                  </form>
                </div>
              </div>
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
        this.modalForm = document.querySelector('.modal__body .form');
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
        if (this.modalForm) {
            this.modalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.onEnterChatHandler();
            });
        }

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
            if (this.websocket?.readyState === WebSocket.OPEN && this.currentUser) {
                this.websocket.send(JSON.stringify({
                    type: 'exit',
                    user: this.currentUser
                }));
            }
        });
    }

    connectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
        }

        this.websocket = new WebSocket(AMVERA_WS_URL);

        this.websocket.addEventListener('open', () => {
            console.log('Успешно подключились к WS чата');
            this.toggleChatStatus(true);
            this.websocket.send(JSON.stringify({
                type: 'login',
                name: this.currentUser
            }));
        });

        this.subscribeOnEvents();
    }

    subscribeOnEvents() {
        if (!this.websocket) return;

        this.websocket.addEventListener('message', (e) => {
            console.log('WS сообщение от сервера получено:', e.data);
            const response = JSON.parse(e.data);

            if (response.type === 'message' || response.type === 'send' || response.message) {
                const messageName = response.data?.name || response.user?.name || response.name;
                const messageText = response.data?.text || response.message || response.text;

                const now = new Date();
                const defaultDateTime = `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
                const messageTime = response.data?.dateTime || response.dateTime || defaultDateTime;

                if (messageText) {
                    this.renderMessage({
                        name: messageName,
                        text: messageText,
                        dateTime: messageTime
                    });
                }
            } 

            if (response.type === 'userlist' || response.users || Array.isArray(response)) {
                const users = response.users || (Array.isArray(response) ? response: response.data);
                if (Array.isArray(users) && this.userListContainer) {
                    this.userListContainer.replaceChildren();

                    users.forEach(user => {
                        const userEl = document.createElement('div');
                        userEl.classList.add('chat__user');

                        if (user.name === this.currentUser) {
                            userEl.classList.add('chat__user-me');
                        } 

                        userEl.textContent = user.name;

                        this.userListContainer.appendChild(userEl);
                    }); 
                }
            }
        });

        this.websocket.addEventListener('close', (e) => {
            console.log('Соединение с сервером закрыто', e.reason);
            this.toggleChatStatus(false);

            if (this.currentUser) {
                console.log('Попытка переподключения через 3 секунды...');
                setTimeout(() => this.connectWebSocket(), 3000);
            }
        });

        this.websocket.addEventListener('error', (err) => {
            console.error('Ошибка WebSocket:', err);
            this.toggleChatStatus(false);
        });
    }

    toggleChatStatus(isOnline) {
        if (!this.messageInput) return;
        if (isOnline) {
            this.messageInput.disabled = false;
            this.messageInput.placeholder = 'Напишите сообщение...';
            this.messageInput.style.backgroundColor = '';
        } else {
            this.messageInput.disabled = true;
            this.messageInput.placeholder = 'Соединение разорвано. Пытаемся восстановить связь...';
            this.messageInput.style.backgroundColor = '#f5f5f5';
        }
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

            this.connectWebSocket();
        } catch (error) {
            this.modalHint.textContent = error.message || 'Не удалось подключиться к серверу.';
            console.error('Ошибка входа в чат:', error);
        }
    }

    sendMessage() {
        const text = this.messageInput.value.trim();
        if (!text) return;

        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.warn('Не удалось отправить сообщение: нет соединения с сервером.');
            return;
        }

        const now = new Date();
        const dateStr = now.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateTimeStr = `${timeStr} ${dateStr}`;

        const messageData = {
            type: 'message',
            name: this.currentUser,
            message: text,
            user: {
                name: this.currentUser
            },
            dateTime: dateTimeStr
        };

        this.websocket.send(JSON.stringify(messageData));
        this.messageInput.value = '';
    }

    renderMessage(data) {
        if (!this.messagesContainer) return;

        const messageEl = document.createElement('div');
        messageEl.classList.add('message__container');

        let displayName = data.name;

        if (data.name === this.currentUser) {
            messageEl.classList.add('message__container-yourself');
            displayName = 'You';
        } else {
            messageEl.classList.add('message__container-interlocutor');
        }

        const headerEl = document.createElement('div');
        headerEl.classList.add('message__header');
        headerEl.textContent = `${displayName}, ${data.dateTime}`;

        const textEl = document.createElement('div');
        textEl.classList.add('message__text');
        textEl.textContent = data.text;

        messageEl.appendChild(headerEl);
        messageEl.appendChild(textEl);

        this.messagesContainer.appendChild(messageEl);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}
