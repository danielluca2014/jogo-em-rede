import * as net from 'net';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const client: net.Socket = net.createConnection({ port: 3000 }, () => {
  console.log('Conectado ao servidor');
});

client.on('data', (data: Buffer) => {
  try {
    console.log(data.toString());
    rl.question('=> ', (resposta: string) => {
      client.write(resposta);
    });
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