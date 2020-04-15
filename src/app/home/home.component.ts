import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { GameService } from '../services/game.service';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { backUrl } from '../../variables';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogData } from '../modals/gameId/DialogData';
import { ModalComponent } from '../modals/gameId/modal.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isUserLogged: boolean;
  user: User;
  game: any;
  isWaitingGame: boolean;
  iOweTheGame: boolean = false;
  gameStarted: boolean = false;
  playerNumber = 1;
  serverUrl = `${backUrl}/socket`;
  channelUrl;
  stompClient;
  gameId: number;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService,
    public dialog: MatDialog
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    this.isWaitingGame = false;
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ModalComponent, {
      width: '250px',
      data: { id: this.gameId, username: this.user.name },
    });

    dialogRef.afterClosed().subscribe((gameId) => {
      if (gameId) {
        console.log('Popup closed with a valid gameId');
        console.log(gameId);
      }
    });
  }

  ngOnInit(): void {}

  joinGame(): void {
    this.isWaitingGame = true;
  }

  addCurentPlayerToTheCreatedGamge(): void {
    this.stompClient.send(
      `/app/games/${this.game.id}/roles`,
      {},
      JSON.stringify({ game: { id: this.game.id }, user: { id: this.user.id } })
    );
  }

  async initializeWebSocketConnection() {
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/users`,
        (message) => {
          console.log('My message received: ');
          console.log(message.body);
        }
      );
      this.stompClient.subscribe(`/app/games/${this.game.id}`, (message) => {
        console.log('Game is started');
        // Change location with game
        // Start the game
        this.game = JSON.parse(message.body);
        this.gameStarted = true;
      });
    });
  }

  createGame(): void {
    this.gameService.create().subscribe((game) => {
      console.log('My game');
      console.log(game);
      this.game = game;
      this.channelUrl = `/app/games/${game.id}/users`;
      this.initializeWebSocketConnection().then((data) => {
        setTimeout(() => {
          this.isWaitingGame = true;
          this.iOweTheGame = true;
          this.addCurentPlayerToTheCreatedGamge();
        }, 1000);
      });
    });
  }

  cancel(): void {
    this.isWaitingGame = false;
  }

  startTheGame(): void {
    this.stompClient.send(`/app/games/${this.game.id}`, {}, `{}`);
  }
}
