import { Component, OnInit } from '@angular/core';
import { GameService } from '../services/game.service';
import { AuthenticationService } from '../services/authentication.service';
import { User } from '../models/user';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { backUrl } from 'src/variables';
import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';
import { NotifierService } from 'angular-notifier';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import {
  MatDialog,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogData } from '../modals/gameId/DialogData';
import { ModalComponent } from '../modals/gameId/modal.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent implements OnInit {
  user: User;
  game: any;
  alive;
  winner: boolean = false;
  roleType;
  word;
  civilWord;
  undercoverWord;
  words = [];
  isVoteEnable: boolean = false;
  isMyTurn: boolean = false;
  isTheLastToVote: boolean = false;
  numberOfVotes = 0;
  numberOfPlayersAlives;
  turnOfUserId;
  turnNumber;
  turnNumberId;
  index = 0;
  numberOfRoles = [];
  roleId;
  firstInstructions = 'Renseignez un mot lors de votre tour';
  secondInstructions = "Voter contre l'un des joueurs";
  instructions = this.firstInstructions;
  wordForm: FormGroup;
  serverUrl = `${backUrl}/socket`;
  stompClient;
  misterWhiteRoleId;
  constructor(
    private authenticationService: AuthenticationService,
    private gameService: GameService,
    private formBuilder: FormBuilder,
    private notifier: NotifierService,
    private router: Router,
    public dialog: MatDialog
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    // this.gameService.currentGame.subscribe((x) => (this.game = x));
    this.game = this.gameService.getGame();
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

      // Update roles number or initialize if doesn't exist
      if (this.numberOfRoles.hasOwnProperty(role.roleType)) {
        this.numberOfRoles[role.roleType] += 1;
      } else {
        this.numberOfRoles[role.roleType] = 1;
      }

      // For the user itself
      if (role.user.id === this.user.id) {
        if (index === 0) {
          this.isMyTurn = true;
          this.notifier.notify('info', `It is your turn.`);
        }
        this.roleId = role.id;
        this.roleType = role.roleType;
        this.alive = role.alive;
      }
    });
    this.numberOfPlayersAlives = this.game.roles.length;
    this.civilWord = this.game.civilWord;
    this.undercoverWord = this.game.undercoverWord;
    if (this.roleType === 'CIVIL') {
      this.word = this.game.civilWord;
    } else if (this.roleType === 'UNDERCOVER') {
      this.word = this.game.undercoverWord;
    } else if (this.roleType === 'MISTERWHITE') {
      this.word = '^^ (Mr. White)';
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
          this.notifier.notify('info', `It is your turn.`);
        } else {
          this.isMyTurn = false;
        }
      } else {
        this.nextTurn();
      }
    } else {
      this.notifier.notify('info', `Time to vote.`);
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
    // Disable message log
    this.stompClient.debug = (message) => {};
    this.stompClient.connect({}, (frame) => {
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/words`,
        (message) => {
          const word = JSON.parse(message.body);
          // Save words and senders in order to display
          this.game.roles.map((role) => {
            if (word.role.id === role.id) {
              this.notifier.notify(
                'info',
                `${role.user.name} says ${word.word}.`
              );
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
          const msg = JSON.parse(message.body);
          const voterId = msg.voter.id;
          this.game.roles
            // Filter role id to get only one role
            .filter((role) => role.id == voterId)
            // Filter if it's not the current user
            .filter((role) => role.id != this.roleId)
            .map((role) => {
              this.notifier.notify('info', `${role.user.name} has voted.`);
            });
          this.numberOfVotes = this.numberOfVotes + 1;
          if (this.numberOfVotes === this.numberOfPlayersAlives - 1) {
            this.isTheLastToVote = true;
          }
        }
      );
      this.stompClient.subscribe(
        `/app/games/${this.game.id}/turns`,
        (message) => {
          // Check if the game is ended (if there are winners)
          const info = JSON.parse(message.body);
          if (info.winnersId.length > 0) {
            info.winnersId.map((winnerRoleId) => {
              // if my user is a winner
              if (winnerRoleId === this.roleId) {
                this.winner = true;
                Swal.fire({
                  title: `Congratulations ${this.roleType}, you won!`,
                  text: `Civil's word was ${this.civilWord}, undercover's word was ${this.undercoverWord}.`,
                  imageUrl: 'https://i.ibb.co/VQxZKJC/trophy.png',
                  imageWidth: 200,
                  imageHeight: 200,
                  imageAlt: 'trophy',
                  confirmButtonColor: '#2c2c2c',
                  confirmButtonText: 'Return to the home page',
                  backdrop: `
                      rgba(0,0,123,0.4)
                      url("https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif")
                      center left
                      round
                    `,
                }).then((result) => {
                  if (result.value) {
                    this.router.navigate([`/home`]);
                  }
                });
              }
            });
            if (!this.winner) {
              Swal.fire({
                title: `${this.roleType} lost the game.`,
                text: `Civil's word was ${this.civilWord}, undercover's word was ${this.undercoverWord}.`,
                confirmButtonColor: '#2c2c2c',
                confirmButtonText: 'Return to the home page',
                backdrop: `
                rgba(0,0,123,0.4)
                url("https://media.giphy.com/media/psmj4cmTGQQ0We0Uyf/giphy.gif")
                center left
                no-repeat
              `,
              }).then((result) => {
                if (result.value) {
                  this.router.navigate([`/home`]);
                }
              });
            }
          } else {
            // Check if exists
            if (info.eliminatedPlayerId) {
              // Check if misterWhite
              this.game.roles.map((role) => {
                if (role.id === info.eliminatedPlayerId) {
                  if (role.roleType === 'MISTERWHITE') {
                    // Mister white has been eliminated
                    this.misterWhiteRoleId = role.id;
                    // Ask the word of Mr White
                    if (this.roleType === 'MISTERWHITE' && this.alive) {
                      this.turnNumberId = info.turnId;
                      this.openMisterWhiteDialog();
                    } else {
                      // Other player are waiting for mister white vote.
                      this.instructions = 'En attente du vote de mister white.';
                      this.notifier.notify(
                        'info',
                        `Mr. White has been eliminated.`
                      );
                    }
                  } else {
                    // Someonelse has been elimnated
                    this.updateGameInformation(info);
                  }
                }
              });
            } else {
              if (this.roleType === 'MISTERWHITE') {
                this.notifier.notify(
                  'error',
                  `You have not discovered the civil word.`
                );
              } else {
                this.notifier.notify(
                  'success',
                  `Mr. White hasn't discovered the civil word.`
                );
              }
              // Keep going the game
              this.updateGameInformation(info);
            }
          }
        }
      );
    });
  }

  updateGameInformation(info): void {
    this.instructions = this.firstInstructions;
    this.turnNumberId = info.turnId;
    this.turnNumber = this.turnNumber + 1;
    // Reset number of votes
    this.isTheLastToVote = false;
    this.numberOfVotes = 0;
    // Update number of players in the game
    this.numberOfPlayersAlives = this.numberOfPlayersAlives - 1;
    let eliminatedPlayerId;
    if (info.eliminatedPlayerId) {
      eliminatedPlayerId = info.eliminatedPlayerId;
    } else {
      eliminatedPlayerId = this.misterWhiteRoleId;
    }

    // For every players
    this.game.roles.map((role) => {
      if (role.id === eliminatedPlayerId) {
        // Tell who is dead
        role.alive = false;

        // Update roles number
        this.numberOfRoles[role.roleType] -= 1;

        // For the eliminated Player
        if (eliminatedPlayerId === this.roleId) {
          this.notifier.notify('error', `You have been eliminated.`);
          this.alive = false;
        } else {
          this.notifier.notify(
            'info',
            `${role.user.name} was eliminated. Was ${role.roleType}.`
          );
        }
      }
    });
    for (let i = 0; i < this.game.roles.length; i++) {
      if (this.game.roles[i].alive) {
        this.index = i;
        this.turnOfUserId = this.game.roles[i].user.id;
        if (this.user.id === this.turnOfUserId) {
          this.notifier.notify('info', `It is your turn.`);
          this.isMyTurn = true;
        }
        break;
      }
    }
  }

  openMisterWhiteDialog(): void {
    const dialogRef = this.dialog.open(ModalComponent, {
      width: '250px',
      data: {
        question: 'What do you think the civil word is?',
        placeholder: 'souris',
      },
    });
    dialogRef.afterClosed().subscribe((misterWhiteWord) => {
      if (misterWhiteWord) {
        this.stompClient.send(
          `/app/games/${this.game.id}/words/mrWhite`,
          {},
          JSON.stringify({
            role: {
              id: this.roleId,
            },
            turn: {
              id: this.turnNumberId,
            },
            word: misterWhiteWord,
          })
        );
      }
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
    // Test if there is only one word in word variable
    if (word.indexOf(' ') !== -1) {
      return;
    }
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
    // Clear the form after submission
    this.wordForm.reset();
  }
}
