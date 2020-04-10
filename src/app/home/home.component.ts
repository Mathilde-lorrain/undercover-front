import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isUserLogged: boolean;
  user: User;
  isWaitingGame: boolean;

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

  createGame(): void {
    this.gameService.create();
  }

  cancel(): void {
    this.isWaitingGame = false;
  }
}
