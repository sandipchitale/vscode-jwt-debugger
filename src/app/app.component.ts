import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AppService } from './app.service';

interface Algorithms {
  name: string;
  algorithm: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {

  algorithms: Algorithms[] = [
    {name: 'HS256', algorithm: 'HS256'}
  ];

  private _selectedAlgorithm = this.algorithms[0].algorithm;

  // tslint:disable-next-line: variable-name
  private _jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';

  header = '';

  // tslint:disable-next-line: variable-name
  private _payload = '';

  signatureVerified = true;

  // tslint:disable-next-line: variable-name
  private _secret = 'secret';
  _base64EncodedSecret = false;

  constructor(
    private translate: TranslateService,
    private appService: AppService,
    private changeDetectorRef: ChangeDetectorRef,
    @Inject(DOCUMENT) private document: Document,
    ) {
    this.translate.setDefaultLang('en');

    this.appService.message.subscribe((message: any) => {
      switch (message.command) {
        case 'verifyJwtResult':
          this.signatureVerified = message.signatureVerified;
          break;
        case 'signed':
          this._jwt = message.jwt;
          this.appService.verifyJwt(this.jwt, this.realSecret);
          this.changeDetectorRef.markForCheck();
          break;
        case 'colorTheme':
          this.adjustTheme();
          break;
      }
    });

    this.extractHeaderPayloadSignature();
  }

  ngAfterViewInit(): void {
    this.adjustTheme();
  }

  adjustTheme() {
    let theme = 'light-theme';
    if (document.body.classList.contains('vscode-light')) {
      theme = 'light-theme';
    } else if (document.body.classList.contains('vscode-dark')) {
      theme = 'dark-theme';
    }
    const themeLink = this.document.getElementById('app-theme') as HTMLLinkElement;
    if (themeLink) {
        themeLink.href = theme + '.css';
    }
  }

  public get selectedAlgorithm() {
    return this._selectedAlgorithm;
  }
  public set selectedAlgorithm(value) {
    this._selectedAlgorithm = value;
  }

  get jwt(): string {
    return this._jwt;
  }

  set jwt(newJwt: string) {
    this._jwt = newJwt;
    this.extractHeaderPayloadSignature();
  }

  get encodedHeader(): string {
    if (this.jwt) {
      const jwtParts = this.jwt.split('.');
      if (jwtParts.length === 3) {
        return jwtParts[0];
      }
    }
    return '';
  }

  get encodedPayload(): string {
    if (this.jwt) {
      const jwtParts = this.jwt.split('.');
      if (jwtParts.length === 3) {
        return jwtParts[1];
      }
    }
    return '';
  }

  get encodedSignature(): string {
    if (this.jwt) {
      const jwtParts = this.jwt.split('.');
      if (jwtParts.length === 3) {
        return jwtParts[2];
      }
    }
    return '';
  }

  get secret(): string {
    return this._secret;
  }

  get realSecret(): string {
    return (this._base64EncodedSecret ? atob(this._secret) : this._secret)
  }

  set secret(newSecret: string) {
    this._secret = newSecret;
    this.signatureVerified = false;
    this.appService.verifyJwt(this.jwt, this.realSecret);
  }

  get base64EncodedSecret(): boolean {
    return this._base64EncodedSecret;
  }

  set base64EncodedSecret(newBase64EncodedSecret: boolean) {
    this._base64EncodedSecret = newBase64EncodedSecret;
    this.signatureVerified = false;
    this.appService.verifyJwt(this.jwt, this.realSecret);
  }

  get payload(): string {
    return this._payload;
  }

  set payload(newPayload: string) {
    this._payload = newPayload;
    this.sign();
  }

  sign() {
    try {
      this.appService.sign(JSON.parse(this.payload), this.realSecret);
    } catch (error) {
      this._jwt = '';
      this.appService.verifyJwt(this.jwt, this.realSecret);
    }
  }

  extractHeaderPayloadSignature() {
    this.header = this.parseHeader(this._jwt);
    this._payload = this.parsePayload(this._jwt);
    this.signatureVerified = false;
    this.appService.verifyJwt(this.jwt, this.realSecret);
  }

  parseHeader(token: string) {
    return this.parseTokenPart(token, 0);
  }

  parsePayload(token: string) {
    return this.parseTokenPart(token, 1);
  }

  parseTokenPart(token: string, index: number) {
    const jsonObject: any = atob(token.split('.')[index].replace('-', '+').replace('_', '/'));
    try {
      const o = JSON.parse(jsonObject);
      return this.orderedJsonStringify(o);
    } catch (error) {
      return jsonObject;
    }
  }

  orderedJsonStringify(o) {
    return JSON.stringify(Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {}), null, 2);
  }

}
