import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AppMenu } from "@/editor/TopBar/AppMenu"

const noop = () => {}

describe("AppMenu", () => {
  it("shows the app version on the About line", async () => {
    const user = userEvent.setup()
    render(<AppMenu onOpen={noop} onSave={noop} onImportImage={noop} onExport={noop} />)

    await user.click(screen.getByRole("button")) // open the Design menu
    expect(await screen.findByText("About Boojy Design")).toBeInTheDocument()
    // Injected from package.json via Vite's `define`; assert the shape so version bumps don't break it.
    expect(screen.getByText(/^v\d+\.\d+\.\d+/)).toBeInTheDocument()
  })
})
