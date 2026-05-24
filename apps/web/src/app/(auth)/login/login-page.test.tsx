import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import LoginPage from './page'

describe('LoginPage', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders the 企业智能题库 login form', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: '企业智能题库' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })
})
