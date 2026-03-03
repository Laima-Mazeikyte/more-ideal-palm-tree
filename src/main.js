import './style.css'
import { createIcons, Plus, X, User, ChevronDown, Check } from 'lucide'
import { supabase } from './supabase.js'
import {
  signInAnonymously,
  signUp,
  signIn,
  signOut,
  getSession,
  onAuthStateChange,
  claimAnonymousTodos,
} from './auth.js'
import { loadPaths, createPath, addStepToPath, removeStepFromPath, loadStepPathsMap } from './paths.js'
import { loadMilestones, createMilestone, calculateProgress } from './milestones.js'
import { renderWeekView } from './week-view.js'
import { getView, setView, buildBreadcrumb } from './views.js'
import { createPicker } from './picker.js'

// ─── DOM ────────────────────────────────────────────────────────────────────

const form = document.querySelector('.todo-app__form')
const input = document.querySelector('#todo-input')
const itemsContainer = document.querySelector('.todo-app__items')
const eyebrow = document.querySelector('.todo-app__eyebrow')
const progressEl = document.querySelector('.todo-app__progress')

const pathPickerRoot = document.querySelector('.path-picker')
const pathPickerCreateInput = document.querySelector('.path-picker__create-input')

const milestonePickerRoot = document.querySelector('.milestone-picker')
const milestonePickerCreateInput = document.querySelector('.milestone-picker__create-input')

const weekViewContainer = document.querySelector('.week-view')
const viewNavTabs = document.querySelectorAll('.view-nav__tab')

const authDialog = document.querySelector('.auth-dialog')
const authAuthView = document.querySelector('.auth-dialog__auth-view')
const authUserView = document.querySelector('.auth-dialog__user-view')
const authForm = document.querySelector('.auth-dialog__form')
const authEmailInput = document.querySelector('#auth-email')
const authPasswordInput = document.querySelector('#auth-password')
const authErrorEl = document.querySelector('.auth-dialog__error')
const authSubmitButton = document.querySelector('.auth-dialog__submit')
const authSubmitLabel = document.querySelector('.auth-dialog__submit-label')
const authTabs = document.querySelectorAll('.auth-dialog__tab')
const authPasswordToggle = document.querySelector('.auth-dialog__password-toggle')

const accountButton = document.querySelector('.todo-app__account-button')
const authDialogUserEmail = document.querySelector('.auth-dialog__user-email')
const authDialogSignOut = document.querySelector('.auth-dialog__sign-out')

if (!form || !input || !itemsContainer) {
  throw new Error('Todo app markup is missing required elements.')
}

// Set date in eyebrow
if (eyebrow) {
  eyebrow.textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

// ─── State ──────────────────────────────────────────────────────────────────

let steps = []
let journeys = []
let paths = []
let milestones = []
let stepPathsMap = new Map()
let selectedJourneyId = null
let selectedPathId = null
let selectedMilestoneId = null
let currentUserId = null
let isAnonymousUser = true
const renderedIds = new Set()
let authMode = 'signup' // 'signup' | 'signin'
let savedScrollTop = 0

// ─── Icons ──────────────────────────────────────────────────────────────────

function hydrateIcons() {
  createIcons({
    icons: { Plus, X, User, ChevronDown, Check },
    attrs: { 'aria-hidden': 'true' },
  })
}

// ─── Progress (Momentum Line) ───────────────────────────────────────────────

function updateProgress() {
  if (!progressEl) return
  const total = steps.length

  if (total === 0) {
    progressEl.textContent = ''
    return
  }

  const noun = total === 1 ? 'step' : 'steps'
  progressEl.textContent = `${total} ${noun} today`
}

// ─── Picker Helpers ──────────────────────────────────────────────────────────

function buildJourneyOption(journey, isSelected) {
  const option = document.createElement('button')
  option.type = 'button'
  option.className = 'journey-picker__option'
  option.setAttribute('role', 'option')
  option.dataset.journeyId = journey.id
  option.dataset.journeySlug = journey.slug
  option.setAttribute('aria-selected', String(isSelected))

  const dot = document.createElement('span')
  dot.className = 'journey-picker__option-dot'
  dot.setAttribute('aria-hidden', 'true')
  dot.dataset.journeySlug = journey.slug

  const label = document.createElement('span')
  label.className = 'journey-picker__option-label'
  label.textContent = journey.name

  const checkIcon = document.createElement('i')
  checkIcon.dataset.lucide = 'check'
  checkIcon.className = 'journey-picker__option-check'

  option.append(dot, label, checkIcon)
  return option
}

function buildSimpleOption(item, isSelected, prefix, idKey) {
  const option = document.createElement('button')
  option.type = 'button'
  option.className = `${prefix}__option`
  option.setAttribute('role', 'option')
  option.dataset[idKey] = item.id
  option.setAttribute('aria-selected', String(isSelected))

  const label = document.createElement('span')
  label.className = `${prefix}__option-label`
  label.textContent = item.name

  const checkIcon = document.createElement('i')
  checkIcon.dataset.lucide = 'check'
  checkIcon.className = `${prefix}__option-check`

  option.append(label, checkIcon)
  return option
}

// ─── Picker Instances ────────────────────────────────────────────────────────

const journeyPicker = createPicker({
  trigger: document.querySelector('.journey-picker__trigger'),
  dropdown: document.querySelector('.journey-picker__dropdown'),
  label: document.querySelector('.journey-picker__label'),
  dot: document.querySelector('.journey-picker__dot'),
  idKey: 'journeyId',
  slugKey: 'journeySlug',
  buildOption: (item, isSelected) => buildJourneyOption(item, isSelected),
  onSelect: (id) => {
    selectedJourneyId = id
    selectedMilestoneId = null
    milestonePicker.selectedId = null
    populateMilestonePicker()
  },
  getDisplayName: (id) => journeys.find((j) => j.id === id)?.name ?? 'Journey',
  getDisplaySlug: (id) => journeys.find((j) => j.id === id)?.slug ?? '',
})

const pathPicker = createPicker({
  trigger: document.querySelector('.path-picker__trigger'),
  dropdown: document.querySelector('.path-picker__dropdown'),
  optionsContainer: document.querySelector('.path-picker__options'),
  label: document.querySelector('.path-picker__label'),
  idKey: 'pathId',
  hasNoneOption: true,
  buildOption: (item, isSelected) => buildSimpleOption(item, isSelected, 'path-picker', 'pathId'),
  onSelect: (id) => {
    selectedPathId = id
  },
  getDisplayName: (id) => paths.find((p) => p.id === id)?.name ?? 'Path',
})

const milestonePicker = createPicker({
  trigger: document.querySelector('.milestone-picker__trigger'),
  dropdown: document.querySelector('.milestone-picker__dropdown'),
  optionsContainer: document.querySelector('.milestone-picker__options'),
  label: document.querySelector('.milestone-picker__label'),
  idKey: 'milestoneId',
  hasNoneOption: true,
  buildOption: (item, isSelected) => buildSimpleOption(item, isSelected, 'milestone-picker', 'milestoneId'),
  onSelect: (id) => {
    selectedMilestoneId = id
  },
  getDisplayName: (id) => milestones.find((m) => m.id === id)?.name ?? 'Milestone',
})

function populateJourneyPicker() {
  journeyPicker.populate(journeys)
  if (!journeyPicker.selectedId && journeys.length > 0) {
    journeyPicker.select(journeys[0].id)
    selectedJourneyId = journeys[0].id
  }
}

function populatePathPicker() {
  pathPicker.populate(paths)
}

function populateMilestonePicker() {
  const filtered = milestones.filter((m) => m.journey_id === selectedJourneyId)
  milestonePicker.populate(filtered)
}

function updateAuthDependentUI() {
  if (pathPickerRoot) {
    pathPickerRoot.classList.toggle('is-hidden', isAnonymousUser)
  }
  if (milestonePickerRoot) {
    milestonePickerRoot.classList.toggle('is-hidden', isAnonymousUser)
  }
}

// ─── Picker Events ───────────────────────────────────────────────────────────

const allPickers = [journeyPicker, pathPicker, milestonePicker]

function closeAllPickers() {
  allPickers.forEach((p) => p.close())
}

function closeOtherPickers(current) {
  allPickers.forEach((p) => { if (p !== current) p.close() })
  closeAllItemJourneyPickers()
}

journeyPicker.trigger?.addEventListener('click', (event) => {
  event.stopPropagation()
  closeOtherPickers(journeyPicker)
  journeyPicker.toggle()
})

journeyPicker.dropdown?.addEventListener('click', (event) => {
  const option = event.target.closest('.journey-picker__option')
  if (!option) return
  journeyPicker.select(option.dataset.journeyId)
  selectedJourneyId = journeyPicker.selectedId
  journeyPicker.close()
})

pathPicker.trigger?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  event.stopPropagation()
  closeOtherPickers(pathPicker)
  pathPicker.toggle()
})

pathPicker.dropdown?.querySelector('.path-picker__options')?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  const option = event.target.closest('.path-picker__option')
  if (!option) return
  pathPicker.select(option.dataset.pathId)
  selectedPathId = pathPicker.selectedId
  pathPicker.close()
})

pathPickerCreateInput?.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  const name = pathPickerCreateInput.value.trim()
  if (!name || !currentUserId || isAnonymousUser) return

  pathPickerCreateInput.disabled = true
  const newPath = await createPath(name, currentUserId)
  pathPickerCreateInput.disabled = false
  pathPickerCreateInput.value = ''

  if (newPath) {
    paths.push(newPath)
    populatePathPicker()
    pathPicker.select(newPath.id)
    selectedPathId = pathPicker.selectedId
    pathPicker.close()
  }
})

milestonePicker.trigger?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  event.stopPropagation()
  closeOtherPickers(milestonePicker)
  milestonePicker.toggle()
})

milestonePicker.dropdown?.querySelector('.milestone-picker__options')?.addEventListener('click', (event) => {
  if (isAnonymousUser) return
  const option = event.target.closest('.milestone-picker__option')
  if (!option) return
  milestonePicker.select(option.dataset.milestoneId)
  selectedMilestoneId = milestonePicker.selectedId
  milestonePicker.close()
})

milestonePickerCreateInput?.addEventListener('keydown', async (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  const name = milestonePickerCreateInput.value.trim()
  if (!name || !currentUserId || !selectedJourneyId || isAnonymousUser) return

  milestonePickerCreateInput.disabled = true
  const newMs = await createMilestone(selectedJourneyId, name, currentUserId)
  milestonePickerCreateInput.disabled = false
  milestonePickerCreateInput.value = ''

  if (newMs) {
    milestones.push(newMs)
    populateMilestonePicker()
    milestonePicker.select(newMs.id)
    selectedMilestoneId = milestonePicker.selectedId
    milestonePicker.close()
  }
})

// ─── Item Journey Pickers ─────────────────────────────────────────────────────

function closeAllItemJourneyPickers() {
  itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((dropdown) => {
    dropdown.hidden = true
    dropdown
      .closest('.journey-picker')
      ?.querySelector('.journey-picker__item-trigger')
      ?.classList.remove('is-open')
  })
}

// Close pickers when clicking outside
document.addEventListener('click', (event) => {
  for (const p of allPickers) {
    if (p.isOpen()) {
      const root = p.trigger?.closest('.journey-picker, .path-picker, .milestone-picker')
      if (root && !root.contains(event.target)) p.close()
    }
  }
  // Close any item journey pickers not containing the click target
  itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((dropdown) => {
    const picker = dropdown.closest('.journey-picker')
    if (picker && !picker.contains(event.target)) {
      dropdown.hidden = true
      picker.querySelector('.journey-picker__item-trigger')?.classList.remove('is-open')
    }
  })
})

// Close pickers on Escape
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  for (const p of allPickers) {
    if (p.isOpen()) {
      p.close()
      p.trigger?.focus()
    }
  }
  closeAllItemJourneyPickers()
})

// ─── Render ─────────────────────────────────────────────────────────────────

function buildItemJourneyPicker(step) {
  const journey = step.journeys

  const wrapper = document.createElement('div')
  wrapper.className = 'journey-picker todo-item__journey-picker'

  const badge = document.createElement('button')
  badge.type = 'button'
  badge.className = 'todo-item__journey-badge journey-picker__item-trigger'
  badge.textContent = journey?.name ?? ''
  badge.dataset.stepId = step.id
  if (journey?.slug) badge.dataset.journeySlug = journey.slug
  badge.setAttribute('aria-label', `Change journey for "${step.text}"`)
  badge.setAttribute('aria-haspopup', 'listbox')

  const dropdown = document.createElement('div')
  dropdown.className = 'journey-picker__dropdown'
  dropdown.setAttribute('role', 'listbox')
  dropdown.hidden = true

  for (const j of journeys) {
    const option = document.createElement('button')
    option.type = 'button'
    option.className = 'journey-picker__option'
    option.setAttribute('role', 'option')
    option.setAttribute('aria-selected', String(j.id === step.journey_id))
    option.dataset.journeyId = j.id
    option.dataset.stepId = step.id

    const dot = document.createElement('span')
    dot.className = 'journey-picker__option-dot'
    dot.setAttribute('aria-hidden', 'true')
    dot.dataset.journeySlug = j.slug

    const label = document.createElement('span')
    label.className = 'journey-picker__option-label'
    label.textContent = j.name

    const checkIcon = document.createElement('i')
    checkIcon.dataset.lucide = 'check'
    checkIcon.className = 'journey-picker__option-check'

    option.append(dot, label, checkIcon)
    dropdown.append(option)
  }

  wrapper.append(badge, dropdown)
  return wrapper
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatStepTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()

  if (isToday) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupStepsByJourney(stepsList) {
  const groups = new Map()
  for (const step of stepsList) {
    const slug = step.journeys?.slug ?? '_none'
    if (!groups.has(slug)) {
      groups.set(slug, {
        journey: step.journeys,
        steps: [],
      })
    }
    groups.get(slug).steps.push(step)
  }
  // Sort groups by journey sort_order (fall back to order of first appearance)
  const sorted = [...groups.values()]
  sorted.sort((a, b) => {
    const aOrder = journeys.findIndex((j) => j.slug === a.journey?.slug)
    const bOrder = journeys.findIndex((j) => j.slug === b.journey?.slug)
    return aOrder - bOrder
  })
  return sorted
}

// ─── Render Helpers ──────────────────────────────────────────────────────────

function buildGroupHeader(journey, stepCount) {
  const header = document.createElement('div')
  header.className = 'journey-group__header'
  header.dataset.groupSlug = journey?.slug ?? '_none'
  if (journey?.slug) header.dataset.journeySlug = journey.slug

  const dot = document.createElement('span')
  dot.className = 'journey-group__dot'
  dot.setAttribute('aria-hidden', 'true')
  if (journey?.slug) dot.dataset.journeySlug = journey.slug

  const name = document.createElement('span')
  name.className = 'journey-group__name'
  name.textContent = journey?.name ?? 'Uncategorized'

  const count = document.createElement('span')
  count.className = 'journey-group__count'
  count.textContent = stepCount

  header.append(dot, name, count)
  return header
}

function buildStepElement(step, journey, isNew) {
  const item = document.createElement('article')
  item.className = 'todo-item'
  if (step.completed) item.classList.add('is-completed')
  if (journey?.slug) item.dataset.journeySlug = journey.slug
  item.dataset.stepId = step.id

  if (isNew) {
    item.classList.add('is-new')
    renderedIds.add(step.id)
  }

  const tileDot = document.createElement('span')
  tileDot.className = 'todo-item__dot'
  tileDot.setAttribute('aria-hidden', 'true')
  if (journey?.slug) tileDot.dataset.journeySlug = journey.slug

  const text = document.createElement('p')
  text.className = 'todo-item__text'
  text.textContent = step.text

  const timestamp = document.createElement('time')
  timestamp.className = 'todo-item__timestamp'
  timestamp.textContent = formatStepTime(step.created_at)
  if (step.created_at) timestamp.setAttribute('datetime', step.created_at)

  const stepPaths = stepPathsMap.get(step.id)
  let pathBadgesEl = null
  if (stepPaths && stepPaths.length > 0) {
    pathBadgesEl = document.createElement('div')
    pathBadgesEl.className = 'todo-item__paths'
    for (const p of stepPaths) {
      const badge = document.createElement('span')
      badge.className = 'todo-item__path-badge'
      badge.textContent = p.name
      pathBadgesEl.append(badge)
    }
  }

  const actions = document.createElement('div')
  actions.className = 'todo-item__actions'

  const itemPicker = buildItemJourneyPicker(step)

  const deleteButton = document.createElement('button')
  deleteButton.className = 'todo-item__delete-button'
  deleteButton.type = 'button'
  deleteButton.dataset.todoId = step.id
  deleteButton.setAttribute('aria-label', `Delete "${step.text}"`)

  const icon = document.createElement('i')
  icon.dataset.lucide = 'x'
  deleteButton.append(icon)

  actions.append(itemPicker, deleteButton)
  item.append(tileDot, text, timestamp, actions)

  const breadcrumb = buildBreadcrumb(step, { journeys, paths, milestones, stepPathsMap })
  if (breadcrumb) item.append(breadcrumb)

  const hasPaths = pathBadgesEl != null
  const milestone = step.milestones
  const hasMilestone = milestone && milestone.target_count

  if (hasPaths || hasMilestone) {
    const metaRow = document.createElement('div')
    metaRow.className = 'todo-item__meta'

    if (pathBadgesEl) metaRow.append(pathBadgesEl)

    if (hasMilestone) {
      const stepsInMilestone = steps.filter((s) => s.milestone_id === milestone.id)
      const progress = calculateProgress(milestone, stepsInMilestone)

      const milestoneEl = document.createElement('div')
      milestoneEl.className = 'todo-item__milestone'

      const msName = document.createElement('span')
      msName.className = 'todo-item__milestone-name'
      msName.textContent = milestone.name

      const bar = document.createElement('div')
      bar.className = 'milestone-bar'
      if (journey?.slug) bar.dataset.journeySlug = journey.slug

      const fill = document.createElement('div')
      fill.className = 'milestone-bar__fill'
      fill.style.width = `${(progress.percentage ?? 0) * 100}%`

      bar.append(fill)
      milestoneEl.append(msName, bar)
      metaRow.append(milestoneEl)
    }

    item.append(metaRow)
  }

  return item
}

function updateGroupCount(slug) {
  const header = itemsContainer.querySelector(`.journey-group__header[data-group-slug="${slug}"]`)
  if (!header) return
  const count = itemsContainer.querySelectorAll(`.todo-item[data-journey-slug="${slug}"]`).length
  const countEl = header.querySelector('.journey-group__count')
  if (countEl) countEl.textContent = count
}

function findGroupInsertionPoint(slug) {
  // Find the correct position among existing group headers, based on journey sort order
  const targetOrder = journeys.findIndex((j) => j.slug === slug)
  const headers = itemsContainer.querySelectorAll('.journey-group__header')
  for (const header of headers) {
    const headerSlug = header.dataset.groupSlug
    const headerOrder = journeys.findIndex((j) => j.slug === headerSlug)
    if (headerOrder > targetOrder) return header
  }
  return null // append at end
}

function getGroupLastElement(slug) {
  // Get the last step element in a journey group (to append after it)
  const stepsInGroup = itemsContainer.querySelectorAll(`.todo-item[data-journey-slug="${slug}"]`)
  return stepsInGroup.length > 0 ? stepsInGroup[stepsInGroup.length - 1] : null
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderSteps() {
  itemsContainer.replaceChildren()

  if (steps.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'todo-empty'
    empty.textContent = 'Every journey starts with a single step.'
    itemsContainer.append(empty)
    updateProgress()
    return
  }

  const groups = groupStepsByJourney(steps)

  for (const group of groups) {
    const journey = group.journey
    itemsContainer.append(buildGroupHeader(journey, group.steps.length))

    for (const step of group.steps) {
      const isNew = !renderedIds.has(step.id)
      itemsContainer.append(buildStepElement(step, journey, isNew))
    }
  }

  hydrateIcons()
  updateProgress()
  refreshWeekView()
}

// ─── Week View ──────────────────────────────────────────────────────────────

function refreshWeekView() {
  if (!weekViewContainer || weekViewContainer.hidden) return
  renderWeekView(weekViewContainer, { paths, steps, stepPathsMap, milestones, journeys })
}

// ─── View Navigation ────────────────────────────────────────────────────────

viewNavTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setView(tab.dataset.view)
  })
})

document.addEventListener('viewchange', (event) => {
  const view = event.detail.view

  // Update tab active states
  viewNavTabs.forEach((tab) => {
    const isActive = tab.dataset.view === view
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-pressed', String(isActive))
  })

  if (view === 'today') {
    // Show today, hide week
    if (weekViewContainer) weekViewContainer.hidden = true
    itemsContainer.hidden = false
    form.hidden = false
    // Restore scroll position
    window.scrollTo(0, savedScrollTop)
  } else if (view === 'week') {
    // Save scroll position before switching
    savedScrollTop = window.scrollY
    // Show week, hide today
    itemsContainer.hidden = true
    form.hidden = true
    if (weekViewContainer) {
      weekViewContainer.hidden = false
      refreshWeekView()
    }
  }
})

// ─── Supabase CRUD ───────────────────────────────────────────────────────────

async function loadJourneys() {
  const { data, error } = await supabase
    .from('journeys')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to load journeys:', error.message)
    return
  }

  journeys = data
  populateJourneyPicker()
}

async function loadAllPaths() {
  paths = await loadPaths()
  populatePathPicker()
}

async function loadAllMilestones() {
  milestones = await loadMilestones()
  populateMilestonePicker()
}

async function loadSteps() {
  const { data, error } = await supabase
    .from('steps')
    .select('*, journeys(id, name, slug), milestones(id, name, target_count)')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load steps:', error.message)
    return
  }

  steps = data
  stepPathsMap = await loadStepPathsMap()
  for (const step of steps) {
    renderedIds.add(step.id)
  }
  renderSteps()
}

async function addStep(text, journeyId) {
  if (!currentUserId) {
    console.warn('Cannot add step without an authenticated session.')
    return
  }
  const insertPayload = { text, completed: false, journey_id: journeyId, user_id: currentUserId }
  if (selectedMilestoneId) insertPayload.milestone_id = selectedMilestoneId

  const { data, error } = await supabase
    .from('steps')
    .insert(insertPayload)
    .select('*, journeys(id, name, slug), milestones(id, name, target_count)')
    .single()

  if (error) {
    console.error('Failed to add step:', error.message)
    return
  }

  try {
    // Associate with selected path if any, but never block rendering the new step
    if (selectedPathId) {
      const ok = await addStepToPath(data.id, selectedPathId)
      if (ok) {
        const path = paths.find((p) => p.id === selectedPathId)
        if (path) {
          stepPathsMap.set(data.id, [{ id: path.id, name: path.name }])
        }
      }
    }
  } catch (assocError) {
    console.error('Failed to associate step with path:', assocError)
  }

  steps.push(data)

  // Incremental DOM insert instead of full re-render
  const journey = data.journeys
  const slug = journey?.slug ?? '_none'

  // Remove empty-state message if present
  const emptyEl = itemsContainer.querySelector('.todo-empty')
  if (emptyEl) emptyEl.remove()

  // Create group header if this journey group doesn't exist yet
  let groupHeader = itemsContainer.querySelector(`.journey-group__header[data-group-slug="${slug}"]`)
  if (!groupHeader) {
    groupHeader = buildGroupHeader(journey, 0)
    const insertBefore = findGroupInsertionPoint(slug)
    itemsContainer.insertBefore(groupHeader, insertBefore)
  }

  // Insert the new step after the last step in its group (or after the header)
  const lastInGroup = getGroupLastElement(slug)
  const stepEl = buildStepElement(data, journey, true)
  if (lastInGroup) {
    lastInGroup.after(stepEl)
  } else {
    groupHeader.after(stepEl)
  }

  updateGroupCount(slug)
  hydrateIcons()
  updateProgress()
  refreshWeekView()
}

async function toggleStep(id, completed) {
  const { error } = await supabase
    .from('steps')
    .update({ completed })
    .eq('id', id)

  if (error) {
    console.error('Failed to update step:', error.message)
    const step = steps.find((s) => s.id === id)
    if (step) step.completed = !completed
    // Revert the DOM toggle
    const itemEl = itemsContainer.querySelector(`.todo-item[data-step-id="${id}"]`)
    if (itemEl) itemEl.classList.toggle('is-completed', !completed)
    return
  }

  const step = steps.find((s) => s.id === id)
  if (step) step.completed = completed
  // DOM already toggled optimistically in the click handler
}

async function deleteStep(id, itemEl, deleteButton) {
  deleteButton.disabled = true

  const { error } = await supabase.from('steps').delete().eq('id', id)

  if (error) {
    console.error('Failed to delete step:', error.message)
    deleteButton.disabled = false
    return
  }

  renderedIds.delete(id)
  const slug = itemEl?.dataset.journeySlug ?? '_none'

  const removeFromDom = () => {
    steps = steps.filter((s) => s.id !== id)
    if (itemEl) itemEl.remove()

    // If the group is now empty, remove its header too
    const remaining = itemsContainer.querySelectorAll(`.todo-item[data-journey-slug="${slug}"]`)
    if (remaining.length === 0) {
      const header = itemsContainer.querySelector(`.journey-group__header[data-group-slug="${slug}"]`)
      if (header) header.remove()
    } else {
      updateGroupCount(slug)
    }

    // Show empty state if no steps left
    if (steps.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'todo-empty'
      empty.textContent = 'Every journey starts with a single step.'
      itemsContainer.append(empty)
    }

    updateProgress()
    refreshWeekView()
  }

  if (itemEl) {
    itemEl.classList.add('is-removing')
    setTimeout(removeFromDom, 210)
  } else {
    removeFromDom()
  }
}

async function updateStepJourney(id, journeyId) {
  const oldStep = steps.find((s) => s.id === id)
  const oldSlug = oldStep?.journeys?.slug ?? '_none'

  const { data, error } = await supabase
    .from('steps')
    .update({ journey_id: journeyId })
    .eq('id', id)
    .select('*, journeys(id, name, slug)')
    .single()

  if (error) {
    console.error('Failed to update step journey:', error.message)
    return
  }

  const idx = steps.findIndex((s) => s.id === id)
  if (idx !== -1) steps[idx] = data

  // Move DOM element to new group
  const newJourney = data.journeys
  const newSlug = newJourney?.slug ?? '_none'

  // Remove old element
  const oldEl = itemsContainer.querySelector(`.todo-item[data-step-id="${id}"]`)
  if (oldEl) oldEl.remove()

  // Clean up old group if empty
  const oldRemaining = itemsContainer.querySelectorAll(`.todo-item[data-journey-slug="${oldSlug}"]`)
  if (oldRemaining.length === 0) {
    const oldHeader = itemsContainer.querySelector(`.journey-group__header[data-group-slug="${oldSlug}"]`)
    if (oldHeader) oldHeader.remove()
  } else {
    updateGroupCount(oldSlug)
  }

  // Ensure new group exists
  let newHeader = itemsContainer.querySelector(`.journey-group__header[data-group-slug="${newSlug}"]`)
  if (!newHeader) {
    newHeader = buildGroupHeader(newJourney, 0)
    const insertBefore = findGroupInsertionPoint(newSlug)
    itemsContainer.insertBefore(newHeader, insertBefore)
  }

  // Insert rebuilt step element
  const lastInGroup = getGroupLastElement(newSlug)
  const stepEl = buildStepElement(data, newJourney, false)
  if (lastInGroup) {
    lastInGroup.after(stepEl)
  } else {
    newHeader.after(stepEl)
  }

  updateGroupCount(newSlug)
  hydrateIcons()
  refreshWeekView()
}

// ─── Auth UI ─────────────────────────────────────────────────────────────────

function setAuthMode(mode) {
  authMode = mode
  authTabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode
    tab.classList.toggle('is-active', isActive)
    tab.setAttribute('aria-selected', String(isActive))
  })
  if (authSubmitLabel) authSubmitLabel.textContent = mode === 'signup' ? 'Create account' : 'Sign in'
  if (authPasswordInput) {
    authPasswordInput.setAttribute(
      'autocomplete',
      mode === 'signup' ? 'new-password' : 'current-password',
    )
  }
  clearAuthError()
}

function showAuthError(message) {
  if (!authErrorEl) return
  authErrorEl.textContent = message
  authErrorEl.hidden = false
}

function clearAuthError() {
  if (!authErrorEl) return
  authErrorEl.textContent = ''
  authErrorEl.hidden = true
}

function updateHeaderForUser(user) {
  const isAnonymous = !user?.email
  isAnonymousUser = isAnonymous

  if (accountButton) {
    accountButton.classList.toggle('is-signed-in', !isAnonymous)
    if (!isAnonymous) {
      accountButton.dataset.initial = (user.email[0] ?? '?').toUpperCase()
    } else {
      delete accountButton.dataset.initial
    }
  }

  if (authAuthView) authAuthView.hidden = !isAnonymous
  if (authUserView) authUserView.hidden = isAnonymous
  if (!isAnonymous && authDialogUserEmail) {
    authDialogUserEmail.textContent = user.email ?? ''
  }
}

function openAuthDialog() {
  authDialog?.showModal()
  authEmailInput?.focus()
}

function closeAuthDialog() {
  authDialog?.close()
}

authDialog?.addEventListener('close', () => {
  clearAuthError()
  authForm?.reset()
  setAuthMode('signup')
  if (authSubmitButton) authSubmitButton.disabled = false
})

// ─── Auth Events ─────────────────────────────────────────────────────────────

accountButton?.addEventListener('click', () => {
  openAuthDialog()
})

authTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    setAuthMode(tab.dataset.mode)
  })
})

authPasswordToggle?.addEventListener('click', () => {
  if (!authPasswordInput) return
  const isHidden = authPasswordInput.type === 'password'
  authPasswordInput.type = isHidden ? 'text' : 'password'
  authPasswordToggle.classList.toggle('is-visible', isHidden)
  authPasswordToggle.setAttribute('aria-pressed', String(isHidden))
  authPasswordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password')
})

authForm?.addEventListener('submit', async (event) => {
  event.preventDefault()
  const email = authEmailInput?.value.trim() ?? ''
  const password = authPasswordInput?.value ?? ''

  if (!email || !password) {
    showAuthError('Please enter your email and password.')
    return
  }

  authSubmitButton.disabled = true
  clearAuthError()

  if (authMode === 'signup') {
    const { data: sessionData } = await getSession()
    const anonUserId = sessionData.session?.user?.id ?? null
    const wasAnonymous = sessionData.session?.user?.is_anonymous ?? false

    const { data: signUpData, error } = await signUp(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }
    // If email confirmation is required, the user object will have
    // an unconfirmed email. Let them know to check their inbox.
    if (signUpData?.user?.email && !signUpData?.user?.email_confirmed_at) {
      showAuthError('Check your email to confirm your account.')
      authSubmitButton.disabled = false
      return
    }

    if (wasAnonymous && anonUserId && signUpData?.session) {
      const { error: rpcError } = await claimAnonymousTodos(anonUserId)
      if (rpcError) {
        console.error('Failed to migrate anonymous steps on signup:', rpcError.message)
      }
    }

    closeAuthDialog()
  } else {
    const { data: sessionData } = await getSession()
    const anonUserId = sessionData.session?.user?.id ?? null
    const wasAnonymous = sessionData.session?.user?.is_anonymous ?? false

    const { error } = await signIn(email, password)
    if (error) {
      showAuthError(error.message)
      authSubmitButton.disabled = false
      return
    }

    if (wasAnonymous && anonUserId) {
      const { error: rpcError } = await claimAnonymousTodos(anonUserId)
      if (rpcError) {
        console.error('Failed to migrate anonymous steps:', rpcError.message)
      }
    }

    closeAuthDialog()
  }

  authSubmitButton.disabled = false
})

authDialogSignOut?.addEventListener('click', async () => {
  closeAuthDialog()
  await signOut()
  await signInAnonymously()
})

// ─── Step Events ─────────────────────────────────────────────────────────────

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const text = input.value.trim()
  if (!text || !selectedJourneyId) return
  input.value = ''
  input.focus()
  addStep(text, selectedJourneyId)
})

// Unified click handler for items container
itemsContainer.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return

  // Delete button
  const deleteButton = target.closest('.todo-item__delete-button')
  if (deleteButton instanceof HTMLButtonElement) {
    const id = deleteButton.dataset.todoId
    const itemEl = deleteButton.closest('.todo-item')
    deleteStep(id, itemEl, deleteButton)
    return
  }

  // Item journey picker trigger (the badge button)
  const itemTrigger = target.closest('.journey-picker__item-trigger')
  if (itemTrigger instanceof HTMLButtonElement) {
    event.stopPropagation()
    journeyPicker.close()
    const picker = itemTrigger.closest('.journey-picker')
    const dropdown = picker?.querySelector('.journey-picker__dropdown')
    if (!dropdown) return

    // Close all other open item dropdowns
    itemsContainer.querySelectorAll('.journey-picker__dropdown:not([hidden])').forEach((d) => {
      if (d !== dropdown) {
        d.hidden = true
        d.closest('.journey-picker')?.querySelector('.journey-picker__item-trigger')?.classList.remove('is-open')
      }
    })

    if (dropdown.hidden) {
      dropdown.hidden = false
      itemTrigger.classList.add('is-open')
    } else {
      dropdown.hidden = true
      itemTrigger.classList.remove('is-open')
    }
    return
  }

  // Item journey option
  const journeyOption = target.closest('.journey-picker__option[data-step-id]')
  if (journeyOption instanceof HTMLButtonElement) {
    const journeyId = journeyOption.dataset.journeyId
    const stepId = journeyOption.dataset.stepId
    if (!journeyId || !stepId) return

    const dropdown = journeyOption.closest('.journey-picker__dropdown')
    if (dropdown) {
      dropdown.hidden = true
      dropdown
        .closest('.journey-picker')
        ?.querySelector('.journey-picker__item-trigger')
        ?.classList.remove('is-open')
    }

    updateStepJourney(stepId, journeyId)
    return
  }

  // Toggle completion by clicking the tile body (saturation-based, no checkbox)
  const tile = target.closest('.todo-item')
  if (!tile) return
  // Don't toggle if clicking actions area
  if (target.closest('.todo-item__actions')) return

  const id = tile.dataset.stepId
  const step = steps.find((s) => s.id === id)
  if (!step) return

  step.completed = !step.completed
  // Optimistic DOM update — toggleStep handles revert on error
  tile.classList.toggle('is-completed', step.completed)
  toggleStep(id, step.completed)
})

// ─── Init ───────────────────────────────────────────────────────────────────

hydrateIcons()

onAuthStateChange((_event, session) => {
  currentUserId = session?.user?.id ?? null
  updateHeaderForUser(session?.user ?? null)
  updateAuthDependentUI()
  steps = []
  paths = []
  milestones = []
  stepPathsMap = new Map()
  renderedIds.clear()
  loadAllPaths()
  loadAllMilestones()
  loadSteps()
})

async function init() {
  const { data } = await getSession()
  if (!data.session) {
    const { error } = await signInAnonymously()
    if (error) {
      console.error('Failed to sign in anonymously:', error.message)
      // Still try to load journeys/steps in case RLS allows it
    }
    // onAuthStateChange will fire → loadSteps()
  } else {
    currentUserId = data.session.user.id
    updateHeaderForUser(data.session.user)
  }

  // Load journeys, paths, and milestones in parallel (independent queries)
  await Promise.all([loadJourneys(), loadAllPaths(), loadAllMilestones()])

  // If we already had a session (no onAuthStateChange fired), load steps now
  if (data.session) {
    loadSteps()
  }

  updateAuthDependentUI()
}

init()
