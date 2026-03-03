import { createIcons, Check, ChevronDown } from 'lucide'

/**
 * Generic picker factory. Returns an object with open/close/toggle/populate/select
 * methods and a reactive `selectedId` getter.
 *
 * @param {Object} config
 * @param {HTMLElement|null}  config.trigger         – button that opens/closes
 * @param {HTMLElement|null}  config.dropdown        – the dropdown wrapper
 * @param {HTMLElement|null}  config.optionsContainer – where option buttons go (defaults to dropdown)
 * @param {HTMLElement|null}  config.label           – span that shows the selected name
 * @param {HTMLElement|null}  [config.dot]           – optional dot element on the trigger
 * @param {string}            config.idKey           – dataset key on option buttons (e.g. 'journeyId')
 * @param {string}            [config.slugKey]       – optional dataset slug key (e.g. 'journeySlug')
 * @param {boolean}           [config.hasNoneOption] – prepend a "None" deselect option
 * @param {function}          config.buildOption     – (item, isSelected) => HTMLElement
 * @param {function}          [config.onSelect]      – callback(id) after selection changes
 * @param {function}          [config.getDisplayName]– (id) => string for updating label
 * @param {function}          [config.getDisplaySlug]– (id) => string for updating dot/trigger slug
 */
export function createPicker(config) {
  const {
    trigger,
    dropdown,
    label,
    dot,
    idKey,
    slugKey,
    hasNoneOption = false,
    buildOption,
    onSelect,
    getDisplayName,
    getDisplaySlug,
  } = config

  const optionsContainer = config.optionsContainer ?? dropdown

  let _selectedId = null

  function open() {
    if (!dropdown || !trigger) return
    dropdown.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    trigger.classList.add('is-open')
  }

  function close() {
    if (!dropdown || !trigger) return
    dropdown.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    trigger.classList.remove('is-open')
  }

  function toggle() {
    if (dropdown?.hidden) {
      open()
    } else {
      close()
    }
  }

  function isOpen() {
    return dropdown ? !dropdown.hidden : false
  }

  function updateDisplay() {
    if (label) {
      label.textContent = getDisplayName ? getDisplayName(_selectedId) : ''
    }
    if (dot && getDisplaySlug) {
      dot.dataset[slugKey] = getDisplaySlug(_selectedId) ?? ''
    }
    if (trigger && getDisplaySlug && slugKey) {
      trigger.dataset[slugKey] = getDisplaySlug(_selectedId) ?? ''
    }
    if (trigger && !dot) {
      // Path/Milestone style: toggle is-selected class
      trigger.classList.toggle('is-selected', !!_selectedId)
    }
  }

  function select(id) {
    _selectedId = id || null
    updateDisplay()

    if (!optionsContainer) return
    optionsContainer.querySelectorAll('[role="option"]').forEach((opt) => {
      const optId = opt.dataset[idKey]
      opt.setAttribute('aria-selected', String(optId === (_selectedId ?? '')))
    })

    if (onSelect) onSelect(_selectedId)
  }

  function populate(items) {
    if (!optionsContainer) return
    optionsContainer.replaceChildren()

    for (const item of items) {
      const option = buildOption(item, item.id === _selectedId)
      optionsContainer.append(option)
    }

    if (hasNoneOption && items.length > 0) {
      const none = document.createElement('button')
      none.type = 'button'
      none.className = `${optionsContainer.className.split('__')[0]}__option ${optionsContainer.className.split('__')[0]}__option--none`
      none.setAttribute('role', 'option')
      none.dataset[idKey] = ''
      none.setAttribute('aria-selected', String(!_selectedId))

      const noneLabel = document.createElement('span')
      noneLabel.className = `${optionsContainer.className.split('__')[0]}__option-label`
      noneLabel.textContent = 'None'
      none.append(noneLabel)
      optionsContainer.prepend(none)
    }

    createIcons({
      icons: { Check, ChevronDown },
      attrs: { 'aria-hidden': 'true' },
    })

    updateDisplay()
  }

  return {
    open,
    close,
    toggle,
    isOpen,
    populate,
    select,
    updateDisplay,
    get selectedId() {
      return _selectedId
    },
    set selectedId(id) {
      _selectedId = id
    },
    get trigger() {
      return trigger
    },
    get dropdown() {
      return dropdown
    },
  }
}
