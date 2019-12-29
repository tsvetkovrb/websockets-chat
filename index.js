const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);
const multer = require('multer');

const path = require('path');
const static = path.join(__dirname, '/public');

const connections = [];
const userList = [];
const users = {};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public/static/avatars');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(static));
app.use('/public', express.static(__dirname + '/public'));

app.get('/', (_, res) => {
  res.sendFile(`${__dirname}/index.html`);
});

app.post('/upload-new-avatar', upload.single('avatar'), (req, res) => {
  users[req.body.id].image = `/public/static/avatars/${req.file.originalname}`;
  res.end();
});

io.on('connection', socket => {
  connections.push(socket);

  socket.on('new-user', user => {
    const updatedUser = {
      ...user,
      id: socket.id,
      image: '/public/static/avatars/default.png',
    };
    users[socket.id] = updatedUser;

    userList.push(updatedUser);

    const payload = {
      connections: userList.length,
      users: userList,
    };

    io.emit('new-connection', payload);
    socket.emit('new-personal-data', updatedUser);
  });

  socket.on('new-message', message => {
    io.emit('chat-message', {
      message,
      user: users[socket.id],
    });
  });

  socket.on('disconnect', () => {
    connections.splice(connections.indexOf(socket), 1);
    userList.splice(userList.indexOf(users[socket.id]), 1);
    delete users[socket.id];

    const payload = {
      connections: connections.length,
      users: userList,
    };

    io.emit('remove-user', payload);
  });

  socket.on('update-avatar', () => {
    io.emit('new-avatar', {
      ...users[socket.id],
      hasImage: true,
    });
  });
});

server.listen(3000, () => {
  console.log('App runnig on http://localhost:3000');
});
