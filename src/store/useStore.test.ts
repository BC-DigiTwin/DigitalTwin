import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './useStore'

describe('useStore', () => {
    // Reset store to initial state before each test
    beforeEach(() => {
        useStore.setState({
            debugMode: false,
            appState: 'initial',
        })
    })

    describe('Initial State', () => {
        it('should have debugMode set to false initially', () => {
            const state = useStore.getState()
            expect(state.debugMode).toBe(false)
        })

        it('should have appState set to "initial" initially', () => {
            const state = useStore.getState()
            expect(state.appState).toBe('initial')
        })

        it('should have both initial values correct', () => {
            const state = useStore.getState()
            expect(state.debugMode).toBe(false)
            expect(state.appState).toBe('initial')
        })
    })

    describe('Actions', () => {
        it('should update debugMode when setDebugMode is called with true', () => {
            useStore.getState().setDebugMode(true)
            const state = useStore.getState()
            expect(state.debugMode).toBe(true)
        })

        it('should update debugMode when setDebugMode is called with false', () => {
            // First set it to true
            useStore.getState().setDebugMode(true)
            expect(useStore.getState().debugMode).toBe(true)

            // Then set it back to false
            useStore.getState().setDebugMode(false)
            const state = useStore.getState()
            expect(state.debugMode).toBe(false)
        })

        it('should update appState when setAppState is called', () => {
            useStore.getState().setAppState('loading')
            expect(useStore.getState().appState).toBe('loading')
        })

        it('should update appState to all valid states', () => {
            const validStates: Array<'initial' | 'loading' | 'ready' | 'error'> = [
                'initial',
                'loading',
                'ready',
                'error',
            ]

            validStates.forEach((state) => {
                useStore.getState().setAppState(state)
                expect(useStore.getState().appState).toBe(state)
            })
        })

        it('should update both debugMode and appState independently', () => {
            // Set debugMode to true
            useStore.getState().setDebugMode(true)
            expect(useStore.getState().debugMode).toBe(true)
            expect(useStore.getState().appState).toBe('initial') // Should remain unchanged

            // Set appState to 'ready'
            useStore.getState().setAppState('ready')
            expect(useStore.getState().debugMode).toBe(true) // Should remain unchanged
            expect(useStore.getState().appState).toBe('ready')
        })
    })
})
