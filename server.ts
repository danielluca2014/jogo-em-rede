import * as fs from 'fs';
import * as net from 'net';

class Sem_Jogadores_Error extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

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
            throw new Sem_Jogadores_Error("Ops, Não há jogadores cadastrados")
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

    confere_caractere(caractere: string) {
        if (this._letras_usadas.includes(caractere)) {
            return 0;
        }
        let retorno: string[] = this.palavra_incompleta.split('')
        const palavra: string = this.palavra.toLowerCase()
        let qtd: number = 0;

        for (let i = 0; i < palavra.length; i++) {
            if (palavra[i] === caractere.toLowerCase()) {
                retorno[i] = this.palavra.charAt(i)
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

    confere_palavra(): boolean {
        return (this._palavra == this._palavra_incompleta)
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

    Msg_to_players(msg: string): void {
        for (let player of this._jogadores) {
            enviar_msg(player.socket, msg)
        }
    }

    Msg_to_players_wait(msg: string): void {
        for (let player of this._jogadores) {
            if(player.socket == this.jogador_atual.socket){
                continue
            }
            enviar_msg(player.socket, msg)
        }
    }

    Fim_de_jogo(): void {
        for (let player of this._jogadores) {
            enviar_msg(player.socket, `Obrigado por jogar!\n`);
            player.socket.end()
        }
    }

    remove_jogador(socket: net.Socket): void {
        this._jogadores = this._jogadores.filter((jogador) => {
            return jogador.socket !== socket
        })
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

async function Game_Multiplayer(socket: net.Socket): Promise<void> {

    try {

        enviar_msg(socket, "Bem vindo ao jogo da forca multiplayer\n");
        enviar_msg(socket, "Digite seu nome:");
        let nome: string = await leitor(socket);
        jogo.add_jogador(nome, socket);

        //enviar_msg(socket, 'c');
        enviar_msg(socket, `\n\nOlá ${nome}, seja bem vindo ao jogo da forca multiplayer!\n`);
        enviar_msg(socket, `A palavra tem ${jogo.palavra.length} letras.\n`);
        enviar_msg(socket, `A palavra é: ${jogo.palavra_incompleta.split('').join(' ')}.\n`);

        while (jogo.valor_continuidade) {
            try {
                if (jogo.jogador_atual.socket === socket) {
                    enviar_msg(socket, `\n---> Digite uma letra:`);
                    let letra: string = await leitor(socket);
                    if (jogo.letras_usadas.includes(letra)) {
                        //enviar_msg(socket, 'c');
                        enviar_msg(socket, `\n--->  A letra ${letra} já foi utilizada. <---\n`);
                        enviar_msg(socket, 'Tente novamente...\n')
                        continue;
                    } else if (jogo.letras_validas.includes(letra)) {
                        let qtd: number = jogo.confere_caractere(letra);
                        if (qtd > 0) {
                            //enviar_msg(socket, 'c');
                            enviar_msg(socket, `\n---> A letra ${letra} existe na palavra.  <---\n`);
                            jogo.nova_letra_utilizada(letra)
                            jogo.atualizar_palavra_incompleta(letra);
                            if (jogo.confere_palavra()) {

                                jogo.Msg_to_players(`\n\n <---> Parabéns ${jogo.jogador_atual.nome}, você acertou a palavra.  <---> \n`);
                                jogo.Msg_to_players(`A palavra era: --->  ${jogo.palavra}.    <---\n`);
                                jogo.Msg_to_players(`\n\nPlacar:\n`);
                                jogo.Msg_to_players(`${jogo.placar_jogadores()}.\n`);
            
                                jogo.Fim_de_jogo()
                                break;
                            }
                            enviar_msg(socket, `\n---> A palavra é: ${jogo.palavra_incompleta.split('').join(' ')}. <---\n\n`);
                            jogo.prox_jogador();

                        } else {

                            //enviar_msg(socket, 'c');
                            enviar_msg(socket, `\n\n---> Ops... a letra ${letra} não existe na palavra.  <---\n`);
                            jogo.prox_jogador();
                            enviar_msg(socket, `\n---> Vez do jogador ${jogo.jogador_atual.nome}.  <---\n`);
                            enviar_msg(socket, `--->  A palavra é: ${jogo.palavra_incompleta.split('').join(' ')}.  <---\n`);
                        }
                    } else {
                        enviar_msg(socket, `\n---> A letra ${letra} não é válida. <---\n`);
                    }
                } else {
                    
                    // enviar_msg(socket, `Aguarde a sua vez. Jogador Atual: ${jogo.jogador_atual.nome}\n`);

                    while (jogo.jogador_atual.socket !== socket) {
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                    jogo.Msg_to_players('c')
                    jogo.Msg_to_players_wait(`Aguarde a sua vez. Jogador Atual: ${jogo.jogador_atual.nome}\n`)
                    enviar_msg(jogo.jogador_atual.socket, `\n\nSua vez, ${jogo.jogador_atual.nome}!\n`);
                    jogo.Msg_to_players(`\nA palavra é: ${jogo.palavra_incompleta.split('').join(' ')}.\n`)
                }

            } catch (e: any) {
                if (socket.destroy()) {
                    console.log('Socket desconectado')
                    jogo.remove_jogador(socket)
                    break
                }
                if (e instanceof Sem_Jogadores_Error) {
                    if (jogo.confere_palavra()) {
                        jogo = new Jogo()
                    }
                    break
                }
                console.log(`Erro: ${e.message}`)
            }
        }
    } catch (e: any) {

        console.log(`Erro: ${e.message}`)
        jogo.Msg_to_players(`Erro: ${e.message}`)
        jogo.Fim_de_jogo()
    } finally {
        jogo = new Jogo()
    }
}

function enviar_msg(socket: net.Socket, msg: string): void {
    try {
        socket.write(msg)
    } catch (e: any) {
        console.log(`Erro: ${e.message}`)
    }
}

function sortear_palavra() {
    let palavras: string[] = []

    try {
        palavras = fs.readFileSync('palavras_sem_acento.txt', 'utf-8').split(',')
    } catch (e: any) {
        jogo.Msg_to_players("Ops, houve um erro ao sortear a palavra..")
        jogo.Msg_to_players("Tente novamente mais tarde.")
        server.close()
        jogo.Fim_de_jogo()
        return ''
    }
    let palavra_sorteada: string = palavras[Math.floor(Math.random() * palavras.length)]
    while (palavra_sorteada.length <= 3) {
        palavra_sorteada = palavras[Math.floor(Math.random() * palavras.length)]
    }
    return palavra_sorteada

}

const server = net.createServer((socket: net.Socket) => {
    try {
        if (jogo == null) {
            jogo = new Jogo()
        }
        Game_Multiplayer(socket)
    } catch (e: any) {
        console.log(`Erro: ${e.message}`)
        server.close(() => {
            console.log('Servidor encerrado.');
        });
    }
})

server.listen(3000, () => {
    console.log("Servidor rodando na porta 3000.");
})
