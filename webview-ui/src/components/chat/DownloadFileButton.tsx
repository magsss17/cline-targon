import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { useCallback } from "react"
import styled from "styled-components"
import { vscode } from "@/utils/vscode"

interface DownloadFileButtonProps {
	filePath: string
	fileName: string
	fileType: "csv" | "json"
}

const StyledButton = styled(VSCodeButton)`
	margin-top: 8px;
	display: flex;
	align-items: center;
	gap: 6px;
`

const DownloadFileButton: React.FC<DownloadFileButtonProps> = ({ filePath, fileName, fileType }) => {
	const handleDownload = useCallback(() => {
		vscode.postMessage({
			type: "downloadFile",
			filePath,
			fileName,
			fileType,
		})
	}, [filePath, fileName, fileType])

	const iconName = fileType === "csv" ? "file-text" : "json"

	return (
		<StyledButton appearance="secondary" onClick={handleDownload}>
			<span className={`codicon codicon-${iconName}`}></span>
			Download {fileType.toUpperCase()} File
		</StyledButton>
	)
}

export default DownloadFileButton
