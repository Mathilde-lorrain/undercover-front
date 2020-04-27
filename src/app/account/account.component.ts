import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NotifierService } from 'angular-notifier';
import { User } from '../models/user';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  isUserLogged: boolean;
  user: User;
  updateForm: FormGroup;
  loading = false;
  submitted = false;
  editEnabled = false;
  constructor(
    private authenticationService: AuthenticationService,
    private notifier: NotifierService,
    private fb: FormBuilder
  ) {
    this.authenticationService.currentUser.subscribe((x) => (this.user = x));
    this.updateForm = this.fb.group({
      firstName: { value: 'todo', disabled: true },
      lastName: { value: 'todo', disabled: true },
      username: { value: `${this.user.name}`, disabled: true },
      password: { value: `${this.user.password}`, disabled: true },
    });
  }
  // convenience getter for easy access to form fields
  get f() {
    return this.updateForm.controls;
  }

  ngOnInit(): void {}

  onSubmit(): void {
    this.loading = true;
    // TODO: send updated values
    console.log(this.updateForm.value);
    this.notifier.notify('success', 'User updated.');
  }
  changeEditMode(): void {
    this.editEnabled = !this.editEnabled;
    if (this.updateForm.enabled) {
      this.updateForm.disable();
    } else {
      this.updateForm.enable();
    }
  }
}
