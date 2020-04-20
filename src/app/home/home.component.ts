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
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isUserLogged: boolean;
  user: User;
  game: any = { id: '1' };
  isWaitingGame: boolean;
  iOweTheGame: boolean = false;
  // Cannot start the game before 3 players in the game
  iCanStartTheGame: boolean = false;
  usersWaiting = [];
  serverUrl = `${backUrl}/socket`;
  channelUrl;
  stompClient;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService,
    public dialog: MatDialog,
    private router: Router
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    this.isWaitingGame = false;
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(ModalComponent, {
      width: '250px',
      data: { id: this.game.id, username: this.user.name },
    });

    dialogRef.afterClosed().subscribe((gameId) => {
      if (gameId) {
        console.log('Popup closed with a valid gameId');
        this.game.id = gameId;
        this.joinGame();
      }
    });
  }

  ngOnInit(): void {}

  joinGame(): void {
    this.initializeWebSocketConnection().then((data) => {
      setTimeout(() => {
        this.isWaitingGame = true;
        this.addCurentPlayerToTheCreatedGamge();
      }, 1000);
    });
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
          const user = message.body;
          console.log('New user received: ');
          console.log(user);
          this.usersWaiting.push(user);
          if (this.usersWaiting.length >= 3) {
            this.iCanStartTheGame = true;
          }
        }
      );
      this.stompClient.subscribe(`/app/games/${this.game.id}`, (message) => {
        console.log('Game is started');
        // Navigate to the game and start the game
        this.game = JSON.parse(message.body);
        this.gameService.setGame(this.game);
        setTimeout(() => {
          this.router.navigate([`/game/${this.game.id}`]);
        }, 1000);
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
        }, 1500);
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
