import * as net from 'net';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const client: net.Socket = net.createConnection({ port: 3000 }, () => {
    console.clear()
    console.log('Conectado ao servidor');
});

client.on('data', (data: Buffer) => {
    try {
        if (data.toString().charAt(data.toString().length - 1) === ':') {
            console.log(data.toString());
            rl.question('=> ', (resposta: string) => {
                client.write(resposta);
            });
        } else if (data.toString().charAt(0) === 'c') {
            console.clear()
        } else {
            console.log(data.toString());
        }
    } catch (error: any) {
        console.log(`Erro: ${error.message}`);
    }
});

client.on('error', (error: Error) => {
    console.log(`Erro: ${error.message}`);
});

client.on('end', () => {
    console.log('Desconectado do servidor');
});
