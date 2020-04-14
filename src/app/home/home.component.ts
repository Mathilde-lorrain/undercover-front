import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { GameService } from '../services/game.service';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { backUrl } from '../../variables';

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
  serverUrl = `${backUrl}/socket`;
  channelUrl;
  stompClient;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    this.isWaitingGame = false;
  }

  ngOnInit(): void {}

  joinGame(): void {
    this.isWaitingGame = true;
  }

  addCurentPlayerToTheCreatedGamge(): void {
    this.stompClient.send(
      `${this.channelUrl}/${this.user.id}`,
      {},
      JSON.stringify(this.user)
    );
  }

  async initializeWebSocketConnection() {
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe(this.channelUrl, (message) => {
        console.log('My message received: ');
        console.log(message.body);
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
          this.addCurentPlayerToTheCreatedGamge();
        }, 1000);
      });
    });
  }

  cancel(): void {
    this.isWaitingGame = false;
  }
}
