import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata: import('next').Metadata = {
  title: 'Project-R Docs',
  description: 'Documentation for Project-R (R-Factor AI) — AI-driven algorithmic trading platform',
}

const navbar = (
  <Navbar
    logo={<b>Project-R Docs</b>}
    projectLink="https://github.com/charanchatakondu"
  />
)

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} © Project-R (R-Factor AI)
  </Footer>
)

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="nextra-docs-container">
      <Head />
      <Layout
        navbar={navbar}
        pageMap={await getPageMap('/docs')}
        docsRepositoryBase="https://github.com/charanchatakondu"
        footer={footer}
      >
        {children}
      </Layout>
    </div>
  )
}
