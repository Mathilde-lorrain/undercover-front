import { Component, OnInit } from '@angular/core';
import { GameService } from '../services/game.service';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
  user: User;
  game: any;
  alive;
  roleType;
  word;
  roundNumber = 1;
  voteEnable: boolean = false;
  firstInstructions = 'Renseignez un mot lors de votre tour';
  secondInstructions = "Voter contre l'un des joueurs";
  instructions = this.firstInstructions;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    // this.gameService.currentGame.subscribe((x) => (this.game = x));
    this.game = this.gameService.getGame();
    console.log('My game');
    console.log(this.game);
    this.game.roles.map((role) => {
      if (role.user.id === this.user.id) {
        this.roleType = role.roleType;
        this.alive = role.alive;
      }
    });
    if (this.roleType === 'CIVIL') {
      this.word = this.game.civilWord;
    } else if (this.roleType === 'UNDERCOVER') {
      this.word = this.game.undercoverWord;
    }
  }

  ngOnInit(): void {}
}
