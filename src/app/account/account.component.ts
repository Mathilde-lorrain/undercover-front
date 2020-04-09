import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from '../services/authentication.service';
import { FormGroup, FormBuilder } from '@angular/forms';
import { NotifierService } from "angular-notifier";

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss'],
})
export class AccountComponent implements OnInit {
  isUserLogged: boolean;
  updateForm: FormGroup = this.fb.group({
    firstName: {value: "blabla", disabled: true},
    lastName: {value: "blabla", disabled: true},
    username: {value: "blabla", disabled: true},
    password: {value: "blabla", disabled: true}
  });
  loading = false;
  submitted = false;
  editEnabled = false;
  constructor(
    private authenticationService: AuthenticationService,
    private notifier: NotifierService,
    private fb: FormBuilder
  ) {
    this.authenticationService.currentUser.subscribe(
      (x) => (this.isUserLogged = x)
    );
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
    this.notifier.notify("success", "User updated.");
  }
  changeEditMode(): void {
    this.editEnabled = !this.editEnabled;
    if(this.updateForm.enabled){
      this.updateForm.disable();
    }else{
      this.updateForm.enable();
    }
  }
}
