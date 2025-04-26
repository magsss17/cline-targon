import * as vscode from "vscode"
import * as fs from "fs/promises"
import * as path from "path"

/**
 * Downloads a file to the user's downloads folder
 * @param filePath The path of the file to download
 * @param fileName The name to save the file as
 * @param fileType The type of file (csv or json)
 */
export async function downloadFile(filePath: string, fileName: string, fileType: "csv" | "json"): Promise<void> {
	try {
		// Read the file content
		const fileContent = await fs.readFile(filePath, "utf8")

		// Get the downloads folder path
		const downloadsPath = await getDownloadsPath()

		// Create the full path for the downloaded file
		const downloadFilePath = path.join(downloadsPath, fileName)

		// Write the file to the downloads folder
		await fs.writeFile(downloadFilePath, fileContent, "utf8")

		// Show a success message
		vscode.window.showInformationMessage(`${fileType.toUpperCase()} file downloaded to ${downloadFilePath}`)

		// Open the downloads folder
		vscode.env.openExternal(vscode.Uri.file(downloadsPath))
	} catch (error) {
		console.error("Error downloading file:", error)
		vscode.window.showErrorMessage(`Failed to download ${fileType.toUpperCase()} file: ${error.message}`)
	}
}

/**
 * Gets the path to the user's downloads folder
 */
async function getDownloadsPath(): Promise<string> {
	// Try to get the downloads path from the OS
	let downloadsPath: string | undefined

	if (process.platform === "win32") {
		// Windows
		downloadsPath = path.join(process.env.USERPROFILE || "", "Downloads")
	} else if (process.platform === "darwin") {
		// macOS
		downloadsPath = path.join(process.env.HOME || "", "Downloads")
	} else {
		// Linux and others
		downloadsPath = path.join(process.env.HOME || "", "Downloads")
	}

	// Check if the downloads folder exists
	try {
		await fs.access(downloadsPath)
		return downloadsPath
	} catch (error) {
		// If the downloads folder doesn't exist, use the temp directory
		const tempDir = path.join(require("os").tmpdir(), "cline-downloads")
		await fs.mkdir(tempDir, { recursive: true })
		return tempDir
	}
}
