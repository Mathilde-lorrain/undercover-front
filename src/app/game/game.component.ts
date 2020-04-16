import { Component, OnInit } from '@angular/core';
import { GameService } from '../services/game.service';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { backUrl } from 'src/variables';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
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
  words = [];
  roundNumber = 1;
  isVoteEnable: boolean = false;
  isMyTurn: boolean = false;
  turnOfUserId;
  turnNumber;
  index = 0;
  roleId;
  firstInstructions = 'Renseignez un mot lors de votre tour';
  secondInstructions = "Voter contre l'un des joueurs";
  instructions = this.firstInstructions;
  wordForm: FormGroup;
  serverUrl = `${backUrl}/socket`;
  stompClient;

  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService,
    private formBuilder: FormBuilder
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    // this.gameService.currentGame.subscribe((x) => (this.game = x));
    this.game = this.gameService.getGame();
    console.log(this.game);
    this.initializeWebSocketConnection();
    this.turnNumber = this.game.turns[0].turnNumber;
    this.game.roles.map((role, index) => {
      // For every user
      // Initialize turnOfUserId
      if (index === 0) {
        this.turnOfUserId = role.user.id;
      }
      // Initialize array of words
      this.words[`${role.user.name}`] = [];

      // For the user itself
      if (role.user.id === this.user.id) {
        if (index === 0) {
          this.isMyTurn = true;
        }
        this.roleId = role.id;
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

  nextTurn(): void {
    this.index = this.index + 1;
    // Test if index exists. Otherwise, time to vote
    if (this.game.roles[this.index]) {
      this.turnOfUserId = this.game.roles[this.index].user.id;
      if (this.turnOfUserId === this.user.id) {
        this.isMyTurn = true;
      } else {
        this.isMyTurn = false;
      }
    } else {
      console.log('Time to vote');
      // Back to zero
      this.index = 0;
      // Enable vote
      this.isVoteEnable = true;
      // Noone can add a word
      this.isMyTurn = false;
      // Stop the animation
      this.turnOfUserId = -1;
    }
  }

  async initializeWebSocketConnection() {
    let ws = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(ws);
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/words`,
        (message) => {
          console.log('New word received.');
          const word = JSON.parse(message.body);

          // Save words and senders in order to display
          this.game.roles.map((role) => {
            if (word.role.id === role.id) {
              this.words[`${role.user.name}`].push(word.word);
            }
          });

          // Change player
          this.nextTurn();
        }
      );
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/votes`,
        (message) => {
          console.log('votes is started');
          console.log(message.body);
        }
      );
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/turns`,
        (message) => {
          console.log('turn is ended');
          console.log(message.body);
        }
      );
    });
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
    const word = this.wordForm.value.userWord;
    console.log('This is my word to send: ');
    console.log(word);
    this.stompClient.send(
      `/app/games/${this.game.id}/words`,
      {},
      JSON.stringify({
        role: {
          id: this.roleId,
        },
        turn: {
          id: this.turnNumber,
        },
        word: word,
      })
    );
    this.isMyTurn = false;
  }
}
