'use strict'
let logger = require('js-logger-aknudsen').get('db')
let Boom = require('boom')
let R = require('ramda')
let r = require('rethinkdb')

let {getEnvParam,} = require('./environment')

let connectToDb = (host, callback, attempt) => {
  logger.debug(`Trying to connect to RethinkDB host '${host}', attempt #${attempt}`)
  return r.connect({
    host,
    authKey: getEnvParam('RETHINKDB_AUTH_KEY', null),
    db: 'muzhack',
  }).then((conn) => {
    logger.debug(`Successfully connected to RethinkDB host '${host}', attempt ${attempt}`)
    logger.debug(`Invoking callback`)
    try {
      return callback(conn)
        .then((result) => {
          conn.close()
          return result
        }, (error) => {
          conn.close()
          logger.warn(`There was an error in the callback of withDb: '${error}'`, error.stack)
          throw new Error(`There was an error in the callback of withDb`)
        })
    } catch (error) {
      conn.close()
      logger.error(`There was an unhandled exception in the callback of withDb: '${error}'`,
        error.stack)
      throw new Error(`There was an unhandled exception in the callback of withDb`)
    }
  }, (error) => {
    if (attempt < 5) {
      let timeout = attempt * 0.5
      logger.debug(`Waiting ${timeout} second(s) before attempting again to connect to DB...`)
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          connectToDb(host, callback, attempt + 1)
            .then(resolve, reject)
        }, timeout)
      })
    } else {
      logger.warn(`Failed to connect to RethinkDB after ${attempt} attempts: '${error}':`,
        error.stack)
      throw new Error(`Failed to connect to RethinkDB after ${attempt} attempts: '${error}'`)
    }
  })
}

module.exports = {
  withDb: (reply, callback) => {
    let host = getEnvParam('RETHINKDB_HOST', 'localhost')
    return connectToDb(host, callback, 1)
      .then((result) => {
        logger.debug(`Replying with result:`, result)
        reply(result)
      }, (error) => {
        logger.warn(`An error was caught: '${error.message}'`)
        reply(Boom.badImplementation())
      })
  },
  setUp: () => {
    let host = getEnvParam('RETHINKDB_HOST', 'localhost')
    return connectToDb(host, (conn) => {
      return r.table('projects').indexStatus('owner')
        .run(conn)
        .then((results) => {
          let indexPromises = R.filter((promise) => {return promise != null},
              R.map((result) => {
            logger.debug(`Checking index '${result.index}'...`)
            if (!result.ready) {
              logger.debug(`Need to create index`)
              return r.table('projects')
                .indexCreate(result.index)
                .run(conn)
            } else {
              logger.debug(`Index already exists`)
            }
          }, results))
          return Promise.all(indexPromises)
            .then(() => {
              return r.table('projects')
                .indexWait()
                .run(conn)
            })
        })
    })
  },
}
