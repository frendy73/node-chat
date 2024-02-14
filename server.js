const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 8080});

const clients = new Map();

wss.on('connection', function connection(ws) {
    let currentUser = '';

    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'newUser':
                currentUser = data.name;
                const colors = Array.from(clients.values()).map(user => user.color);
                const oldUsers = Array.from(clients.values()).map(client => client.name); // Получаем список имен старых пользователей
                const welcomeMessage = oldUsers.length === 0 ? "Добро пожаловать. Вы первый в чате." : `Добро пожаловать. В чате уже присутствуют: ${oldUsers.join(', ')}.`;
                clients.set(ws, {name: data.name, color: data.color});
                ws.send(JSON.stringify({
                    type: 'welcome',
                    message: welcomeMessage,
                    users: Array.from(clients.values()).map(client => client.name)
                }));
                if (oldUsers.length > 0) {
                    broadcast({type: 'userUpdate', name: data.name, users: Array.from(clients.values()).map(client => client.name)}, ws);
                }
                break;
            case 'message':
                broadcast({
                    type: 'message',
                    name: currentUser,
                    message: data.message,
                    color: clients.get(ws).color
                }, ws);
                break;
            case 'privateMessage':
                const recipientWs = [...clients.keys()].find(ws => clients.get(ws).name === data.recipientName);
                if (recipientWs) {
                    recipientWs.send(JSON.stringify({
                        type: 'privateMessage',
                        name: currentUser,
                        message: data.message,
                        color: clients.get(ws).color
                    }));
                }
                break;
        }
    });

    ws.on('close', () => {
        broadcast({
            type: 'userLeft',
            name: currentUser,
            users: Array.from(clients.values()).map(client => client.name)
        });
        clients.delete(ws);
    });

    function broadcast(data, excludeWs) {
        clients.forEach((_, clientWs) => {
            if (clientWs !== excludeWs) {
                clientWs.send(JSON.stringify(data));
            }
        });
    }
});
