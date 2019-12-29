document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('auth__form');
  const chatForm = document.getElementById('chat__form');
  const authBlock = document.getElementById('auth__block');
  const chatBlock = document.getElementById('chat__block');
  const usersList = document.getElementById('user__list');
  const messageList = document.getElementById('message-list');
  const membersCount = document.getElementById('members__count');
  const loadingPhotoPopup = document.getElementById('loading-photo__popup');
  const personalInformationLayout = document.getElementById(
    'personal__information',
  );
  const cancelButton = document.getElementById('button-cancel');
  const saveButton = document.getElementById('button-save');
  const newAvatarImageInput = document.getElementById('new-avatar-image');
  const imagePreview = document.getElementById('image__preview');

  const socket = io.connect();
  let user = {};

  function createUserLayout(user, message) {
    console.log('TCL: createUserLayout -> user', user)
    const wrapper = document.createElement('div');
    const content = message
      ? `<span class="user__message">${message}</span>`
      : `<span class="user__status">В сети</span>`;

    wrapper.classList.add('user');
    wrapper.innerHTML = `
      <div class="user__photo">
        <img src="${user.image}" alt="logo" data-id="${user.id}">
      </div>
      <div class="user__info">
        <span class="user__name">${user.username}</span>
        ${content}
      </div>
    `;

    return wrapper;
  }

  function appendUser(user, where) {
    const userLayout = createUserLayout(user);

    where.appendChild(userLayout);
  }

  function createMessage(user, message) {
    const messageLayout = document.createElement('li');
    const content = createUserLayout(user, message);

    messageLayout.classList.add('message');
    messageLayout.appendChild(content);

    return messageLayout;
  }

  function appendMessage(user, message, where) {
    const messageLayout = createMessage(user, message);

    where.appendChild(messageLayout);
  }

  authForm.addEventListener('submit', e => {
    e.preventDefault();
    const { username, nickname } = authForm;

    if (!username.value || !nickname.value) {
      return;
    }

    user.username = username.value;
    user.nickname = nickname.value;

    socket.emit('new-user', user);
    authBlock.parentNode.removeChild(authBlock);
    chatBlock.style.display = 'block';
  });

  chatForm.addEventListener('submit', e => {
    e.preventDefault();
    const { message } = chatForm;

    if (message.value) {
      socket.emit('new-message', message.value);
      message.value = '';
    }
  });

  personalInformationLayout.addEventListener('click', () => {
    loadingPhotoPopup.style.display = 'flex';
  });

  cancelButton.addEventListener('click', () => {
    loadingPhotoPopup.style.display = 'none';
  });

  newAvatarImageInput.addEventListener('change', function() {
    if (!this.files[0]) {
      return;
    }

    if (this.files[0].size > 512000) {
      this.value = '';
      return alert('Размер файла слишком большой!');
    }

    if (this.files[0].type !== 'image/png') {
      this.value = '';
      return alert('Файл должен быть .png');
    }

    const reader = new FileReader();

    reader.onload = function(e) {
      imagePreview.src = e.target.result;
    };

    reader.readAsDataURL(this.files[0]);
  });

  saveButton.addEventListener('click', () => {
    const formData = new FormData();
    const avatarImage = newAvatarImageInput.files[0];

    if (!avatarImage) {
      return alert('Выберите фотографию!')
    }

    formData.append('avatar', avatarImage);
    formData.append('id', user.id);

    fetch('/upload-new-avatar', { method: 'POST', body: formData }).then(() => {
      socket.emit('update-avatar');

      newAvatarImageInput.value = '';
      loadingPhotoPopup.style.display = 'none';
    });
  });

  socket.on('new-connection', ({ connections, users = [] }) => {
    membersCount.innerText = connections;

    usersList.innerHTML = '';
    users.forEach(user => {
      appendUser(user, usersList);
    });
  });

  socket.on('new-personal-data', personalData => {
    user = { ...personalData };

    personalInformationLayout.innerHTML = `
    <div class="me__photo">
      <img src="${personalData.image}" alt="avatar" data-id="${personalData.id}" />
    </div>
    <span class="me__name">${personalData.username}</span>
    `;
  });

  socket.on('chat-message', ({ user, message }) => {
    appendMessage(user, message, messageList);
    messageList.scrollTo(0, messageList.scrollHeight);
  });

  socket.on('remove-user', ({ connections, users }) => {
    membersCount.innerText = connections;
    usersList.innerHTML = '';

    users.forEach(user => {
      appendUser(user, usersList);
    });
  });

  socket.on('new-avatar', user => {
    const images = document.querySelectorAll(`img[data-id="${user.id}"]`);

    images.forEach(image => {
      image.src = user.image;
      image.style.width = '100%';
    });
  });
});
