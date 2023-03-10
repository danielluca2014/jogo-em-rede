import * as fs from 'fs'
import * as net from 'net';

class Jogador {
    private _id: string;
    private _nome: string;
    private _socket: net.Socket;
    private _pontos: number;
    constructor(id: string, nome: string, socket: net.Socket) {
        this._id = id;
        this._nome = nome;
        this._socket = socket
        this._pontos = 0;
    }

    get id(): string {
        return this._id;
    }

    get nome(): string {
        return this._nome;
    }

    get socket(): net.Socket {
        return this._socket;
    }

    get pontos(): number {
        return this._pontos;
    }

    add_pontuacao(pontos: number): void {
        this._pontos += pontos;
    }
}

class Jogo {
    private _palavra: string;
    private _palavra_incompleta: string;
    private _jogadores: Jogador[];
    private id: number = 0
    private id_jogador_atual: number = 0;
    private _valor_continuidade: boolean;
    private _letras_usadas: string[];
    private _letras_validas: string[];
    private _alfabeto: string;
    private _rodada: number;

    constructor() {
        this._palavra = sortear_palavra();
        this._palavra_incompleta = this.Retira_caracteres(this._palavra);
        this._jogadores = [];
        this._valor_continuidade = true;
        this._letras_usadas = [];
        this._alfabeto = "abcdefghijklmnopqrstuvwxyz";
        this._alfabeto += this._alfabeto.toUpperCase();
        this._letras_validas = this._alfabeto.split('');
        this._rodada = 0;
    }

    add_jogador(nome: string, socket: net.Socket): void {
        this._jogadores.push(new Jogador(this.id.toString(), nome, socket));
        this.id += 1;
    }

    Retira_caracteres(palavra: string): string {
        let palavra_retorno: string = ''
        for (let i = 0; i < palavra.length; i++) {
            if (palavra.charAt(i) === ' ' || palavra.charAt(i) === '-') {
                palavra_retorno += palavra.charAt(i)
            } else {
                palavra_retorno += "_"
            }
        }
        return palavra_retorno
    }

    get palavra(): string {
        return this._palavra;
    }

    get palavra_incompleta(): string {
        return this._palavra_incompleta;
    }

    get jogadores(): Jogador[] {
        return this._jogadores;
    }

    get jogador_atual(): Jogador {
        if (this._jogadores.length == 0) {
            throw new Error("Ops, Não há jogadores cadastrados")
        }
        if (this.id_jogador_atual >= this._jogadores.length) {
            this.id_jogador_atual = 0;
        }
        return this._jogadores[this.id_jogador_atual];
    }

    get valor_continuidade(): boolean {
        return this._valor_continuidade;
    }

    get letras_usadas(): string[] {
        return this._letras_usadas;
    }

    nova_letra_utilizada(letra: string): void {
        this._letras_usadas.push(letra);
    }

    get letras_validas(): string[] {
        return this._letras_validas;
    }

    get rodada(): number {
        return this._rodada;
    }

    set palavra(palavra: string) {
        this._palavra = palavra;
    }

    set palavra_incompleta(palavra_incompleta: string) {
        this._palavra_incompleta = palavra_incompleta;
    }

    atualizar_palavra_incompleta(letra: string) {
        let novaPalavraIncompleta: string = "";
        for (let i = 0; i < this.palavra.length; i++) {
            if (this.palavra.charAt(i) === letra) {
                novaPalavraIncompleta += letra;
            } else {
                novaPalavraIncompleta += this.palavra_incompleta.charAt(i);
            }
        }
        this.palavra_incompleta = novaPalavraIncompleta;
    }

    prox_jogador() {
        this.id_jogador_atual += 1;
        if (this.id_jogador_atual >= this._jogadores.length) {
            this.id_jogador_atual = 0;
        }
    }

    set valor_continuidade(valor_continuidade: boolean) {
        this._valor_continuidade = valor_continuidade;
    }

    confere_caractere(palavra_completa: string, palavra_incompleta: string, caractere: string) {
        let retorno: string[] = palavra_incompleta.split('')
        const palavra: string = palavra_completa.toLowerCase()
        let qtd: number = 0;

        for (let i = 0; i < palavra_completa.length; i++) {
            if (palavra[i] === caractere.toLowerCase()) {
                retorno[i] = palavra_completa.charAt(i)
                qtd++
            }
        }
        if (qtd > 0) {
            this.jogador_atual.add_pontuacao(qtd * 2)
            this._palavra_incompleta = retorno.join('')
            return qtd;
        }
        return 0;
    }

    placar_jogadores(): string {
        let retorno: string = '';
        const jogadoress_ordenados: Jogador[] = this._jogadores.sort((a, b) => {
            return b.pontos - a.pontos
        })
        for (let i = 0; i < jogadoress_ordenados.length; i++) {
            retorno += `${jogadoress_ordenados[i].nome} - ${jogadoress_ordenados[i].pontos} pontos\n`
        }
        return retorno;
    }
}

async function leitor(socket: net.Socket): Promise<string> {
    return new Promise((resolve, reject) => {
        socket.once('data', (data: Buffer) => {
            resolve(data.toString().trim());
        });
    });
}

let jogo: Jogo
let palavra: string;
let palavra_incompleta: string
let jogador_atual: Jogador

async function Game_Multiplayer(socket: net.Socket): Promise<void> {

    palavra = jogo.palavra
    palavra_incompleta = jogo.palavra_incompleta
    socket.write("Bem vindo ao jogo da forca multiplayer\n");
    socket.write("Digite seu nome: ");
    let nome: string = await leitor(socket);
    jogo.add_jogador(nome, socket);

    if(!jogador_atual){
        jogador_atual = jogo.jogador_atual;
    }

    socket.write('cls');
    socket.write(`\nOlá ${jogador_atual.nome}, seja bem vindo ao jogo da forca multiplayer!\n`);
    socket.write(`A palavra tem ${palavra.length} letras\n.`);
    socket.write(`A palavra é: ${palavra_incompleta}\n.`);
    
    while (jogo.valor_continuidade) {
        if(jogador_atual.socket == socket){
            socket.write(`Digite uma letra: `);
            let letra: string = await leitor(socket);
            if (jogo.letras_usadas.includes(letra)) {
                socket.write(`A letra ${letra} já foi utilizada\n.`);
                socket.write(`Digite uma letra: `);
                continue;
            }
            if (jogo.letras_validas.includes(letra)) {
                let qtd: number = jogo.confere_caractere(palavra, palavra_incompleta, letra);
                if (qtd > 0) {
                    socket.write(`A letra ${letra} existe na palavra.\n`);
                    jogo.nova_letra_utilizada(letra)
                    jogo.atualizar_palavra_incompleta(letra);
                    palavra_incompleta = jogo.palavra_incompleta;
                    socket.write(`A palavra é: ${palavra_incompleta}.\n`);
                    socket.write(`Digite uma letra: `);

                    if (jogo.palavra_incompleta === palavra) {
                        socket.write(`Parabéns ${jogador_atual.nome}, você acertou a palavra.\n`);
                        socket.write(`A palavra era: ${palavra}.\n`);
                        socket.write(`Placar:\n`);
                        socket.write(`${jogo.placar_jogadores()}.\n`);
    
                        socket.write(`Digite 1 para jogar novamente ou 0 para sair: `);
                        let opcao: string = await leitor(socket);
                        if (opcao === '1') {
                            jogo = new Jogo();
                            palavra = jogo.palavra;
                            palavra_incompleta = jogo.palavra_incompleta;
                            jogo.add_jogador(nome, socket);
                            let jogador: Jogador = jogo.jogador_atual;
                            socket.write(`\nOlá ${jogador.nome}, seja bem vindo ao jogo da forca multiplayer!\n`);
                            socket.write(`A palavra tem ${palavra.length} letras.\n`);
                            socket.write(`A palavra é: ${palavra_incompleta}.\n`);
                            socket.write(`Digite uma letra: `);
                            continue;
                        } else {
                            socket.write(`Obrigado por jogar!\n`);
                            socket.end();
                            break;
                        }
                    }
    
                } else {
                    socket.write(`A letra ${letra} não existe na palavra.\n`);
                    socket.write(`A palavra é: ${jogo.palavra_incompleta}.\n`);
                    jogo.prox_jogador();
                    jogador_atual = jogo.jogador_atual;
                    socket.write(`Vez do jogador ${jogador_atual.nome}.\n`);
                    socket.write(`A palavra é: ${jogo.palavra_incompleta}\n`);
                    socket.write(`Digite uma letra: `);
                }
            } else {
                socket.write(`A letra ${letra} não é válida.\n`);
                socket.write(`Digite uma letra: `);
            }
        }else {
            socket.write(`Aguarde a sua vez, Jogador Atual: ${jogador_atual.nome}\n`);
           
            while (jogador_atual.socket !== socket) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            socket.write(`Sua vez, ${jogador_atual.nome}!\n`);
            socket.write(`A palavra é: ${palavra_incompleta}.\n`);
            socket.write(`Digite uma letra: `);
        }   
    }
}

function sortear_palavra() {
    const palavras: string[] = fs.readFileSync('palavras_sem_acento.txt', 'utf-8').split(',')
    let palavra_sorteada: string = palavras[Math.floor(Math.random() * palavras.length)]
    while (palavra_sorteada.length <= 3) {
        palavra_sorteada = palavras[Math.floor(Math.random() * palavras.length)]
    }

    return palavra_sorteada
}

const server = net.createServer((socket) => {
   if(jogo == null){
    jogo = new Jogo()
   }
   Game_Multiplayer(socket)
})

server.listen(3000, () => {
    console.log("Servidor rodando na porta 3000.");
})