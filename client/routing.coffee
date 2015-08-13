logger = new Logger('routing')

Router.configure(
  layoutTemplate: 'layout'
  loadingTemplate: 'loading'
  trackPageView: true
)
Router.route('/login', ->
  logger.debug("Handling login route")
  @render('login')
, {
  onBeforeAction: ->
    if Meteor.userId()?
      logger.debug("User is already logged in - redirecting to home")
      @redirect('/')
    else
      @next()
,
  }
)
Router.route('/', ->
  @render('explore')
, {
    name: 'home'
    waitOn: -> Meteor.subscribe("projects")
})
Router.route('/account/forgotpassword', ->
  @render('forgotPassword')
, {
  name: 'forgotPassword',
  onBeforeAction: ->
    if Meteor.userId()?
      @redirect('/')
    else
      @next()
,
  }
)
Router.route('/about', ->
  @render('about')
)
Router.route('/create', ->
  @render('create')
)
Router.route('/u/:owner/:project',
  name: "project"
  controller: ProjectController
)
Router.route("/discourse/sso", ->
  renderError = (error) =>
    @render("discourseSsoError", {data: {reason: error}})

  q = @params.query
  logger.debug("Discourse SSO handler, received payload '#{q.payload} and sig '#{q.sig}'")
  discourseUrl = Meteor.settings.public.discourseUrl
  if !discourseUrl?
    logger.error("Discourse URL not defined in settings")
    renderError("Internal error")
  else
    logger.debug("Calling server to verify Discourse SSO parameters")
    Meteor.call("verifyDiscourseSso", q.payload, q.sig, (error, result) =>
      if error?
        logger.error("Server failed to verify Discourse call: #{error.reason}")
        renderError(error.reason)
      else
        logger.info("Server successfully verified Discourse call")
        [respPayload, respSig] = result
        @redirect("#{discourseUrl}/session/sso_login?sso=#{respPayload}&sig=#{respSig}")
  )
)

configureHotCodePush = (url) ->
  if url in ["/create", "/account/forgotpassword", "/login"]
    logger.debug("Disallowing hot code push for route '#{url}'")
    Session.set("hotCodePushAllowed", false)
  else if url in ["/", "/about", "/account", "/discourse/sso",] or S.startsWith("/u/", url)
    if !Session.get("isEditingProject")
      logger.debug("Allowing hot code push for route '#{url}'")
      Session.set("hotCodePushAllowed", true)
  else
    throw new Error("Unrecognized route '#{url}'")

Router.onBeforeAction(->
  configureHotCodePush(@url)

  if @url in ["/create", "/discourse/sso"] and !Meteor.userId()?
    logger.debug('User not logged in, rendering login page')
    @render('login')
  else if Session.get("isWaiting")
    logger.debug("In waiting mode")
    @render("loading")
  else
    if S.startsWith('/account', @url)
      curSection = "account"
    else if S.startsWith("/create", @url)
      curSection = "create"
    else if S.startsWith("/about", @url)
      curSection = "about"
    else
      curSection = "explore"
    Session.set("currentSection", curSection)

    logger.debug('User is authenticated')
    @next()
)
