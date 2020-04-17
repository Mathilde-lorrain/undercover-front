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
  isVoteEnable: boolean = false;
  isMyTurn: boolean = false;
  isTheLastToVote: boolean = false;
  numberOfVotes = 0;
  turnOfUserId;
  turnNumber;
  turnNumberId;
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
    this.turnNumberId = this.game.turns[0].id;
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

  voteAgainst(targetRoleId) {
    // Can only vote one time per turn
    this.isVoteEnable = false;
    this.stompClient.send(
      `/app/games/${this.game.id}/votes`,
      {},
      JSON.stringify({
        turn: {
          id: this.turnNumberId,
        },
        voter: {
          id: this.roleId,
        },
        target: {
          id: targetRoleId,
        },
        isLast: this.isTheLastToVote,
      })
    );
  }

  nextTurn(): void {
    this.index = this.index + 1;
    // Test if index exists and if the role is alive. Otherwise, time to vote
    if (this.game.roles[this.index]) {
      // If role alive
      if (this.game.roles[this.index].alive) {
        this.turnOfUserId = this.game.roles[this.index].user.id;
        if (this.turnOfUserId === this.user.id) {
          this.isMyTurn = true;
        } else {
          this.isMyTurn = false;
        }
      } else {
        this.nextTurn();
      }
    } else {
      console.log('Time to vote');
      // Update game instructions
      this.instructions = this.secondInstructions;
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
      this.stompClient.subscribe(`/app/games/${this.game.id}/votes`, () => {
        console.log('Someone has voted.');
        this.numberOfVotes = this.numberOfVotes + 1;
        if (this.numberOfVotes === this.game.roles.length - 1) {
          this.isTheLastToVote = true;
        }
      });
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/turns`,
        (message) => {
          console.log('Turn is ended.');
          this.instructions = this.firstInstructions;
          const info = JSON.parse(message.body);
          this.turnNumberId = info.turnId;
          this.turnNumber = this.turnNumber + 1;
          const eliminatedPlayerId = info.eliminatedPlayerId;
          // For every players
          this.game.roles.map((role) => {
            if (role.id === eliminatedPlayerId) {
              // Tell who is dead
              role.alive = false;
              // For the eliminated Player
              if (eliminatedPlayerId === this.roleId) {
                console.log('My ass has been kick out.');
                this.alive = false;
              }
            }
          });
          if (this.alive) {
            for (let i = 0; i < this.game.roles.length; i++) {
              if (this.game.roles[i].alive) {
                console.log('Should display once per user left.');
                this.index = i;
                this.turnOfUserId = this.game.roles[i].user.id;
                if (this.user.id === this.turnOfUserId) {
                  console.log("It's my turn.");
                  this.isMyTurn = true;
                }
                break;
              }
            }
          }
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
          id: this.turnNumberId,
        },
        word: word,
      })
    );
    this.isMyTurn = false;
  }
}
