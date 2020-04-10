import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  isUserLogged: boolean;
  user: User;
  isWaitingGame: boolean;

  constructor(private authenticationService: AuthenticationService) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    this.isWaitingGame = false;
  }

  ngOnInit(): void {}

  joinGame(): void {
    this.isWaitingGame = true;
  }

  createGame(): void {}

  cancel(): void {
    this.isWaitingGame = false;
  }
}
