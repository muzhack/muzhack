'use strict'
let h = require('react-hyperscript')
let component = require('omniscient')
let logger = require('js-logger').get('login')

let {nbsp,} = require('./specialChars')

require('./login.styl')

let SignInForm = component('SignInForm', () => {
  return h('form#signin-form.pure-form.pure-form-stacked', {action: 'action',}, [
    h('fieldset', [
      h('legend', 'Account Info'),
      h('input#signin-email.account-email', {
        autofocus: true,
        type: 'text',
        placeholder: 'email or username',
        name: 'email',
      }),
      h('input.account-password', {
        type: 'password',
        placeholder: 'password',
        name: 'password',
      }),
    ]),
    h('.button-group', [
      h('input#login-button.pure-button.pure-button-primary', {
        type: 'submit',
        value: 'Sign in',
      }),
      h('a#forgot-password.small', {href: '/account/forgotpassword',}, 'Forgot password?'),
    ]),
  ])
})

let SignUpForm = component('SignUpForm', () => {
  return h('form#signup-form.pure-form.pure-form-stacked', {
    action: 'action',
  }, [
    h('#userhint', [
      h('span.required-asterisk', `*${nbsp}`),
      'indicates a required field',
    ]),
    h('fieldset', [
      h('legend', 'Account Info'),
      h('.required', [
        h('input#signup-username.account-username', {
          autofocus: true,
          type: 'text',
          placeholder: 'username',
          required: true,
        }),
      ]),
      h('.required', [
        h('input.account-password', {
          type: 'password',
          'placeholder': 'password',
          required: true,
        }),
      ]),
      h('.required', [
        h('input.account-password-confirm', {
          type: 'password',
          placeholder: 'confirm password',
          required: true,
        }),
      ]),
      h('.required', [
        h('input#signup-email.account-email', {
          autofocus: true,
          type: 'email',
          placeholder: 'email',
          required: true,
        }),
      ]),
      h('.required', [
        h('input#signup-name.account-name', {
          autofocus: true,
          type: 'text',
          placeholder: 'name',
          required: true,
        }),
      ]),
      h('input#signup-website.account-website', {
        autofocus: true,
        type: 'url',
        placeholder: 'website',
      }),
    ]),
    h('.button-group', [
      h('input#signup-button.pure-button.pure-button-primary', {
        type: 'submit',
        value: 'Sign up',
      }),
    ]),
  ])
})

module.exports.render = (cursor) => {
  logger.debug(`Login rendering`)
  let showSignIn = true
  let signInClass = showSignIn ? '.active' : ''
  let signUpClass = !showSignIn ? '.active' : ''

  return h('.pure-g', [
    h('.pure-u-1-5'),
    h('.pure-u-3-5', [
      h('.login-pad', [
        h('.login-header', [
          h('.login-prompt', `Welcome to MuzHack`),
          h('.tabs', [
            h(`#login-signin-tab.tab${signInClass}`, 'Sign In'),
            h(`#login-signup-tab.tab${signUpClass}`, 'Sign Up'),
          ]),
        ]),
        showSignIn ? SignInForm() : SignUpForm(),
      ]),
    ]),
    h('.pure-u-1-5'),
  ])
}
