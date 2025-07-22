# n8n URL Screenshot Workflow

This n8n workflow connects to 4 URLs and takes full screenshots of each page.

## Workflow Overview

The workflow consists of the following components:

1. **URL List Node** - Contains 4 URLs to screenshot
2. **HTTP Request Nodes** - Connect to each URL to verify accessibility
3. **Browser Automation Nodes** - Take full-page screenshots using Puppeteer
4. **Write Binary File Nodes** - Save screenshots with timestamped filenames
5. **Success/Error Handling** - Provides feedback on completion

## How to Import and Use

### 1. Import the Workflow

1. Open your n8n instance
2. Go to Workflows
3. Click "Import from file"
4. Select the `n8n-screenshot-workflow.json` file
5. Click "Import"

### 2. Customize URLs

Edit the "URL List" node to change the target URLs:

```json
{
  "url1": "https://your-first-url.com",
  "url2": "https://your-second-url.com", 
  "url3": "https://your-third-url.com",
  "url4": "https://your-fourth-url.com"
}
```

### 3. Configure Screenshot Settings

In each "Take Screenshot" node, you can adjust:

- **Full Page**: Set to `true` for full-page screenshots
- **Type**: `png` for PNG format
- **Quality**: `90` for high-quality images

### 4. Set Output Directory

In each "Save Screenshot" node, modify the `fileName` parameter to specify your desired output directory:

```
/path/to/your/output/screenshot-1-{{ $now.format('YYYY-MM-DD-HH-mm-ss') }}.png
```

### 5. Run the Workflow

1. Click "Execute Workflow" 
2. Monitor the execution in the execution log
3. Check your output directory for the generated screenshots

## Workflow Features

### Parallel Processing
The workflow processes all 4 URLs in parallel for faster execution.

### Error Handling
- HTTP requests verify URL accessibility before taking screenshots
- Success/error messages provide clear feedback
- Failed screenshots won't block other URLs

### Timestamped Output
Screenshots are saved with timestamps to avoid overwriting:
```
screenshot-1-2024-01-15-14-30-25.png
screenshot-2-2024-01-15-14-30-26.png
screenshot-3-2024-01-15-14-30-27.png
screenshot-4-2024-01-15-14-30-28.png
```

### Browser Automation
Uses Puppeteer for reliable full-page screenshots that capture:
- Complete page content
- Dynamic content after page load
- Proper rendering of JavaScript-heavy sites

## Customization Options

### Add More URLs
1. Duplicate the HTTP Request and Browser Automation nodes
2. Update the URL parameters
3. Add corresponding Save Screenshot nodes
4. Update the Check Success node conditions

### Change Screenshot Format
Modify the Browser Automation nodes:
- **Type**: `png`, `jpeg`, or `webp`
- **Quality**: 1-100 (for JPEG/WebP)

### Add Wait Conditions
In Browser Automation nodes, add:
- **Wait for Selector**: Wait for specific elements
- **Wait for Network Idle**: Wait for network activity to settle
- **Custom Wait Time**: Add delays if needed

### Schedule Execution
Set up triggers to run the workflow:
- **Cron**: Run at specific intervals
- **Webhook**: Trigger via HTTP request
- **Manual**: Run on-demand

## Troubleshooting

### Common Issues

1. **URLs Not Loading**
   - Check URL accessibility
   - Verify network connectivity
   - Increase timeout values

2. **Screenshots Not Saving**
   - Verify output directory permissions
   - Check available disk space
   - Ensure directory exists

3. **Browser Automation Failures**
   - Update Puppeteer dependencies
   - Check for browser compatibility
   - Verify JavaScript execution

### Debug Mode
Enable debug logging in n8n settings to see detailed execution information.

## Requirements

- n8n instance with Browser Automation nodes enabled
- Sufficient disk space for screenshots
- Network access to target URLs
- Puppeteer dependencies (usually auto-installed)

## Security Considerations

- Only screenshot URLs you own or have permission to capture
- Be aware of robots.txt and terms of service
- Consider rate limiting for large-scale operations
- Secure your n8n instance appropriately

## Support

For issues with this workflow:
1. Check n8n documentation
2. Review execution logs
3. Verify node configurations
4. Test with simple URLs first 