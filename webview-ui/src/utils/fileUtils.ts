/**
 * Checks if a file path has a CSV or JSON extension
 * @param filePath The file path to check
 * @returns An object with fileType and fileName if it's a CSV or JSON file, null otherwise
 */
export function getDownloadableFileInfo(filePath: string | undefined): { fileType: "csv" | "json"; fileName: string } | null {
	if (!filePath) return null

	const fileName = filePath.split("/").pop() || ""
	const extension = fileName.split(".").pop()?.toLowerCase()

	if (extension === "csv") {
		return { fileType: "csv", fileName }
	} else if (extension === "json") {
		return { fileType: "json", fileName }
	}

	return null
}
