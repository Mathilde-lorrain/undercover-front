import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { GameService } from '../services/game.service';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { backUrl } from '../../variables';
import { async } from '@angular/core/testing';

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

  // TODO: refacto
  addCurentPlayerToTheCreatedGamge(): void {
    this.stompClient.send(
      `${this.channelUrl}/${this.user.id}`,
      {},
      JSON.stringify(this.user)
    );
  }

  initializeWebSocketConnection() {
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    let that = this;
    this.stompClient.connect({}, function (frame) {
      that.stompClient.subscribe(that.channelUrl, (message) => {
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
      this.initializeWebSocketConnection();
    });
    // TODO: add the user to the game
    //this.addCurentPlayerToTheCreatedGamge();
  }

  cancel(): void {
    this.isWaitingGame = false;
  }
}
