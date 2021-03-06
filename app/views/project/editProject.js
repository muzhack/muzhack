'use strict'
let component = require('omniscient')
let R = require('ramda')
let S = require('underscore.string.fp')
let logger = require('@arve.knudsen/js-logger').get('editProject')
let h = require('react-hyperscript')

let userManagement = require('../../userManagement')
let licenses = require('../../licenses')
let {nbsp,} = require('../../specialChars')
let ajax = require('../../ajax')
let {DescriptionEditor, InstructionsEditor, PicturesEditor,
  FilesEditor,} = require('./editors')
let {Loading,} = require('./loading')
let notification = require('../notification')
let editAndCreateProject = require('./editAndCreateProject')
let {renderFieldError,} = editAndCreateProject
let {trimWhitespace,} = require('../../stringUtils')
let {InvalidTag,} = require('../../validators')

let router
let uploadProject
if (__IS_BROWSER__) {
  uploadProject = require('./uploadProject')
  router = require('../../router')

  require('./editAndCreate.styl')
  require('./editProject.styl')
}

let inputChangeHandler = (fieldName, handler) => {
  return editAndCreateProject.inputChangeHandler(fieldName, 'editProject', handler)
}

let editProject = (cursor) => {
  let editCursor = cursor.cursor('editProject')
  let editProject = editCursor.toJS()
  let input = editProject.project
  uploadProject(input, editCursor, cursor)
    .then(({title, summary, description, instructions, tags, licenseId, username,
        pictureFiles, files,}) => {
      logger.debug(`Picture files:`, pictureFiles)
      logger.debug(`Files:`, files)
      logger.debug(
        `title: ${title}, summary: ${summary}, description: ${description}, ` +
        `tags: ${S.join(`,`, tags)}`)
      let qualifiedProjectId = `${editProject.owner}/${editProject.projectId}`
      let data = {
        title,
        summary,
        description,
        instructions,
        tags,
        licenseId,
        pictures: pictureFiles,
        files,
      }
      logger.debug(`Updating project '${qualifiedProjectId}'...:`, data)

      ajax.putJson(`/api/projects/${qualifiedProjectId}`, data)
        .then(() => {
          logger.info(`Successfully updated project '${qualifiedProjectId}' on server`)
          router.goTo(`/u/${qualifiedProjectId}`)
        }, (error) => {
          editCursor = editCursor.set('isWaiting', false)
            logger.warn(`Failed to update project '${qualifiedProjectId}' on server:`, error)
        })
    }, (error) => {
      logger.warn(`Uploading files/pictures failed: ${error}`, error.stack)
      editCursor = editCursor.set('isWaiting', false)
    })
}

let DeleteProjectDialog = component('DeleteProjectDialog', (cursor) => {
  let yesCallback = () => {
    let editCursor = cursor.cursor('editProject')
    let projectCursor = editCursor.cursor('project')
    let project = projectCursor.toJS()
    let qualifiedProjectId = `${project.owner}/${project.projectId}`

    editCursor.set('isWaiting', true)

    let finalize = () => {
      editCursor.mergeDeep({
        'showDeleteProjectDialog': false,
        'isWaiting': false,
      })
    }

    ajax.delete(`/api/projects/${project.owner}/${project.projectId}`)
      .then(() => {
        logger.debug(`Project successfully deleted '${qualifiedProjectId}'`)
        router.goTo('/')
        finalize()
      }, (error) => {
        logger.warn(`Failed to delete project '${qualifiedProjectId}': ${error}`)
        finalize()
      })
  }

  let closeCallback = () => {
    let editCursor = cursor.cursor('editProject')
    editCursor.set('showDeleteProjectDialog', false)
  }

  let title = 'Delete'
  let message = 'Are you sure you want to delete this project?'
  return notification.question(title, message, yesCallback, closeCallback)
})

let EditGitHubProject = component('EditGitHubProject', (cursor) => {
  return h('#edit-project', [
    h('#edit-buttons.button-group', [
      h('button#cancel-edit.pure-button', {
        onClick: () => {
          logger.debug(`Cancel button clicked`)
          let project = cursor.cursor(['editProject', 'project',]).toJS()
          // TODO: Ask user if there are modifications
          router.goTo(`/u/${project.owner}/${project.projectId}`)
        },
      }, 'Cancel'),
      h('a#remove-project', {
        href: '#',
        onClick: () => {
          logger.debug(`Asked to remove project`)
          cursor.cursor('editProject').set('showDeleteProjectDialog', true)
        },
      }, 'Remove this project'),
    ]),
  ])
})

let EditNonGitHubProject = component('EditNonGitHubProject', (cursor) => {
  let editCursor = cursor.cursor('editProject')
  let projectCursor = editCursor.cursor('project')
  let project = projectCursor.toJS()
  let errors = editCursor.cursor('errors').toJS()
  return h('#edit-project', [
    h('.input-group', [
      h('input#title-input', {
        type: 'text',
        placeholder: 'Project title',
        value: project.title,
        onChange: inputChangeHandler('title', (event, editCursor) => {
          let title = event.target.value
          logger.debug(`Project title changed: '${title}'`)
          editCursor.setIn(['project', 'title',], title)
          if (S.isBlank(title)) {
            return `Title must be filled in`
          } else {
            return null
          }
        }),
      }),
      renderFieldError(errors, 'title'),
    ]),
    h('.input-group', [
      h('input#tags-input', {
        type: 'text',
        placeholder: 'Project tags',
        value: project.tagsString,
        onChange: inputChangeHandler('tags', (event, editCursor) => {
          logger.debug(`Project tags changed: '${event.target.value}'`)
          let tagsString = event.target.value
          editCursor.setIn(['project', 'tagsString',], tagsString)

          let tags = R.reject(
            S.isBlank,
            R.map(trimWhitespace, S.wordsDelim(`,`, tagsString))
          )
          if (R.isEmpty(tags)) {
            logger.debug(`No tags supplied`)
            return `No tags supplied`
          } else {
            logger.debug(`Checking tags for validity:`, tags)
            let validator = R.find(R.prop('isInvalid'), R.map(R.construct(InvalidTag), tags))
            if (validator != null) {
              return validator.errorText
            } else {
              return null
            }
          }
        }),
      }),
      nbsp,
      h('span.icon-tags2'),
      renderFieldError(errors, 'tags'),
    ]),
    h('.input-group', [
      h('select#license-select', {
        placeholder: 'License',
        value: project.licenseId,
        onChange: (event) => {
          logger.debug(`Project license selected:`, licenses[event.target.value])
          cursor.cursor(['editProject', 'project',]).set('licenseId', event.target.value)
        },
      }, R.map(([licenseId, license,]) => {
        return h('option', {value: licenseId,}, license.name)
      }, R.toPairs(licenses))),
    ]),
    h('.input-group', [
      h('input#summary-input', {
        type: 'text',
        placeholder: 'Project summary - One to two sentences',
        value: project.summary,
        onChange: inputChangeHandler('summary', (event, editCursor) => {
          let summary = event.target.value
          logger.debug(`Project summary changed: '${summary}'`)
          editCursor.setIn(['project', 'summary',], summary)
          if (S.isBlank(summary)) {
            return `Summary must be filled in`
          } else {
            return null
          }
        }),
      }),
      renderFieldError(errors, 'summary'),
    ]),
    h('#description-editor', {
      onChange: inputChangeHandler('description', (event) => {
        let description = trimWhitespace(event.target.value)
        logger.debug(`Description changed:`, description)
        return S.isBlank(description) ? `Description must be filled in` : null
      }),
    }, [
      DescriptionEditor(projectCursor),
    ]),
    renderFieldError(errors, 'description'),
    h('#pictures-editor', [
      PicturesEditor({
        cursor: projectCursor,
        changeHandler: inputChangeHandler('pictures', (event) => {
          logger.debug(`Pictures changed:`, event.target.value)
          return R.isEmpty(event.target.value) ? `At least one picture must be supplied` : null
        }),
      }),
    ]),
    renderFieldError(errors, 'pictures'),
    h('#instructions-editor', [
      InstructionsEditor(projectCursor),
    ]),
    h('#files-editor', [
      FilesEditor(projectCursor),
    ]),
    h('#edit-buttons.button-group', [
      h('button#save-project.pure-button.pure-button-primary', {
        onClick: () => {
          logger.debug(`Save button clicked`)
          editCursor = editCursor.mergeDeep({
            isWaiting: 'Saving project...',
          })
          try {
            editProject(cursor)
          } catch (error) {
            editCursor.mergeDeep({
              isWaiting: false,
            })
            throw error
          }
        },
        disabled: !editCursor.get('isReady'),
      }, 'Save'),
      h('button#cancel-edit.pure-button', {
        onClick: () => {
          logger.debug(`Cancel button clicked`)
          let project = cursor.cursor(['editProject', 'project',]).toJS()
          // TODO: Ask user if there are modifications
          router.goTo(`/u/${project.owner}/${project.projectId}`)
        },
      }, 'Cancel'),
      h('a#remove-project', {
        href: '#',
        onClick: () => {
          logger.debug(`Asked to remove project`)
          cursor.cursor('editProject').set('showDeleteProjectDialog', true)
        },
      }, 'Remove this project'),
    ]),
  ])
})

let EditProjectPad = component('EditProjectPad', (cursor) => {
  let editCursor = cursor.cursor('editProject')
  let showDialog = !!editCursor.get('showDeleteProjectDialog')
  let project = editCursor.cursor('project').toJS()
  let isFromGitHub = project.gitHubRepository != null
  logger.debug(`Project being edited is from GitHub: ${isFromGitHub}`)

  return h('#edit-project-pad', [
    showDialog ? DeleteProjectDialog(cursor) : null,
    isFromGitHub ? EditGitHubProject(cursor) : EditNonGitHubProject(cursor),
  ])
})

module.exports = {
  requiresLogin: true,
  render: (cursor) => {
    logger.debug(`Rendering`)
    let projectCursor = cursor.cursor(['editProject', 'project',])
    let project = projectCursor.toJS()
    if (!cursor.cursor('editProject').get('isWaiting')) {
      return h('div', [
        h('h1#project-path', `${project.owner} / ${project.projectId}`),
        EditProjectPad(cursor),
      ])
    } else {
      return Loading(cursor.cursor('editProject'))
    }
  },
  loadData: (cursor, params) => {
    let loggedInUser = userManagement.getLoggedInUser(cursor)
    if (loggedInUser.username !== params.owner) {
      router.goTo(`${params.owner}/${params.projectId}`)
    } else {
      logger.debug(`Loading project ${params.owner}/${params.projectId}`)
      return ajax.getJson(`/api/projects/${params.owner}/${params.projectId}`)
        .then((project) => {
          logger.debug(`Loading project JSON succeeded`)
          return {
            editProject: {
              isWaiting: false,
              owner: params.owner,
              projectId: params.projectId,
              project: R.merge(project, {
                tagsString: S.join(',', project.tags),
              }),
              isReady: true,
              errors: {},
            },
          }
        }, (error) => {
          logger.warn(`Loading project JSON failed: '${error}':`, error.stack)
        })
    }
  },
}
