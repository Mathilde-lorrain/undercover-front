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
import { AvatarGenerator } from 'random-avatar-generator';

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
  usersWaiting = {};
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
      data: { question: 'What is the game id?', placeholder: this.game.id },
    });

    dialogRef.afterClosed().subscribe((gameId) => {
      if (gameId) {
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
    // Disable message log
    this.stompClient.debug = (message) => {};
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/users`,
        (message) => {
          if (this.iOweTheGame) {
            const user = message.body;
            this.usersWaiting[user] = this.generateAvatar(user);
            this.stompClient.send(
              `/app/games/${this.game.id}/usersWaiting`,
              {},
              JSON.stringify(this.usersWaiting)
            );
            if (Object.keys(this.usersWaiting).length >= 3) {
              this.iCanStartTheGame = true;
            }
          }
        }
      );
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/usersWaiting`,
        (message) => {
          if (!this.iOweTheGame) {
            const usersWating = JSON.parse(message.body);
            this.usersWaiting = usersWating;
          }
        }
      );
      this.stompClient.subscribe(`/app/games/${this.game.id}`, (message) => {
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

  copyMessage(val: string) {
    const selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  generateAvatar(name: string): string {
    return AvatarGenerator.prototype.generateRandomAvatar();
  }
}
