import { Component, OnInit } from '@angular/core';
import { GameService } from '../services/game.service';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

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
  isVoteEnable: boolean = false;
  isMyTurn: boolean = false;
  firstInstructions = 'Renseignez un mot lors de votre tour';
  secondInstructions = "Voter contre l'un des joueurs";
  instructions = this.firstInstructions;
  wordForm: FormGroup;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService,
    private formBuilder: FormBuilder
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    // this.gameService.currentGame.subscribe((x) => (this.game = x));
    this.game = this.gameService.getGame();
    console.log('My game');
    console.log(this.game);
    this.game.roles.map((role, index) => {
      if (role.user.id === this.user.id) {
        console.log(index);
        if (index === 0) {
          this.isMyTurn = true;
        }
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

  // convenience getter for easy access to form fields
  get f() {
    return this.wordForm.controls;
  }

  ngOnInit(): void {
    this.wordForm = this.formBuilder.group({
      userWord: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.wordForm.invalid) {
      return;
    }
    console.log('This is my word to send: ');
    console.log(this.wordForm.value.userWord);
  }
}
