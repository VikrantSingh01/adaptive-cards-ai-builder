/**
 * Layout Patterns — Canonical card patterns for deterministic card generation
 */

import type { CardIntent, LayoutPattern } from "../types/index.js";

/**
 * Build a notification card pattern
 */
function notificationPattern(): LayoutPattern {
  return {
    name: "notification",
    description: "Simple notification with header, body text, and optional action",
    intent: ["notification", "status"],
    elements: ["TextBlock", "ActionSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{body}}",
          wrap: true,
        },
      ],
      actions: [],
    },
  };
}

/**
 * Build an approval card pattern
 */
function approvalPattern(): LayoutPattern {
  return {
    name: "approval",
    description: "Approval card with details, facts, and approve/reject actions",
    intent: ["approval"],
    elements: ["TextBlock", "FactSet", "ActionSet", "Container", "ColumnSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "emphasis",
          items: [
            {
              type: "TextBlock",
              text: "{{title}}",
              size: "large",
              weight: "bolder",
              wrap: true,
              style: "heading",
            },
          ],
          bleed: true,
        },
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{avatarUrl}}",
                      size: "small",
                      style: "person",
                      altText: "{{requesterName}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{requesterName}}",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{subtitle}}",
                      isSubtle: true,
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            {
              type: "FactSet",
              facts: [],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Approve",
          style: "positive",
          verb: "approve",
        },
        {
          type: "Action.Execute",
          title: "Reject",
          style: "destructive",
          verb: "reject",
        },
        {
          type: "Action.ShowCard",
          title: "Comment",
          card: {
            type: "AdaptiveCard",
            version: "1.6",
            body: [
              {
                type: "Input.Text",
                id: "comment",
                label: "Add a comment",
                isMultiline: true,
                placeholder: "Enter your comment...",
              },
            ],
            actions: [
              {
                type: "Action.Execute",
                title: "Submit",
                verb: "comment",
              },
            ],
          },
        },
      ],
    },
    example: "expense-report.json",
  };
}

/**
 * Build a data table card pattern
 */
function dataTablePattern(): LayoutPattern {
  return {
    name: "data-table",
    description: "Tabular data display using Table element with headers",
    intent: ["display", "report", "dashboard"],
    elements: ["TextBlock", "Table"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "Table",
          firstRowAsHeader: true,
          showGridLines: true,
          gridStyle: "accent",
          columns: [],
          rows: [],
        },
      ],
    },
  };
}

/**
 * Build a key-value facts card pattern
 */
function factsPattern(): LayoutPattern {
  return {
    name: "facts",
    description: "Key-value pairs displayed using FactSet",
    intent: ["display", "status", "profile"],
    elements: ["TextBlock", "FactSet"],
    dataShape: "key-value",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
    },
  };
}

/**
 * Build an image gallery card pattern
 */
function imageGalleryPattern(): LayoutPattern {
  return {
    name: "image-gallery",
    description: "Image gallery using ImageSet or Carousel",
    intent: ["gallery", "display"],
    elements: ["TextBlock", "ImageSet"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "ImageSet",
          imageSize: "medium",
          images: [],
        },
      ],
    },
    example: "image-gallery.json",
  };
}

/**
 * Build a dashboard card pattern
 */
function dashboardPattern(): LayoutPattern {
  return {
    name: "dashboard",
    description: "Dashboard with metrics in columns and optional chart",
    intent: ["dashboard", "report"],
    elements: ["TextBlock", "ColumnSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "ColumnSet",
          columns: [],
        },
      ],
    },
  };
}

/**
 * Build an input form card pattern
 */
function inputFormPattern(): LayoutPattern {
  return {
    name: "input-form",
    description: "Data collection form with various input types and submit action",
    intent: ["form"],
    elements: [
      "TextBlock",
      "Input.Text",
      "Input.ChoiceSet",
      "Input.Date",
      "Input.Toggle",
      "ActionSet",
    ],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{description}}",
          wrap: true,
          isSubtle: true,
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Submit",
          style: "positive",
          verb: "submit",
        },
      ],
    },
    example: "input-form.json",
  };
}

/**
 * Build a status update card pattern
 */
function statusUpdatePattern(): LayoutPattern {
  return {
    name: "status-update",
    description: "Status update with header, progress indicator, and details",
    intent: ["status", "notification"],
    elements: ["TextBlock", "ColumnSet", "FactSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{iconUrl}}",
                  size: "small",
                  altText: "{{status}}",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "{{title}}",
                  size: "medium",
                  weight: "bolder",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{subtitle}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
    },
    example: "activity-update.json",
  };
}

/**
 * Build a list card pattern
 */
function listPattern(): LayoutPattern {
  return {
    name: "list",
    description: "List of items with titles and optional descriptions",
    intent: ["list", "display"],
    elements: ["TextBlock", "Container"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
      ],
    },
  };
}

/**
 * Build a profile/person card pattern
 */
function profilePattern(): LayoutPattern {
  return {
    name: "profile",
    description: "Person/profile card with avatar, name, role, and contact details",
    intent: ["profile", "display"],
    elements: ["TextBlock", "Image", "ColumnSet", "FactSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{avatarUrl}}",
                  size: "large",
                  style: "person",
                  altText: "{{name}}",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "{{name}}",
                  size: "large",
                  weight: "bolder",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{role}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{organization}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [],
        },
      ],
      actions: [
        {
          type: "Action.OpenUrl",
          title: "View Profile",
          url: "{{profileUrl}}",
        },
      ],
    },
  };
}

/**
 * Build a chart card pattern
 */
function chartPattern(): LayoutPattern {
  return {
    name: "chart",
    description: "Data visualization with bar, line, pie, or donut chart",
    intent: ["dashboard", "report"],
    elements: ["TextBlock", "BarChart"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
      ],
    },
    example: "charts.json",
  };
}

/**
 * Build a flight status card pattern
 */
function flightStatusPattern(): LayoutPattern {
  return {
    name: "flight-status",
    description: "Flight status card with departure/arrival details, gate, and status",
    intent: ["display", "status"],
    elements: ["ColumnSet", "TextBlock", "FactSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "emphasis",
          bleed: true,
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{airline}}",
                      size: "small",
                      isSubtle: true,
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{flightNumber}}",
                      size: "large",
                      weight: "bolder",
                      spacing: "none",
                      wrap: true,
                      style: "heading",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{status}}",
                      weight: "bolder",
                      color: "{{statusColor}}",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "DEPART",
                  size: "small",
                  isSubtle: true,
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{departureCity}}",
                  size: "extraLarge",
                  weight: "bolder",
                  spacing: "none",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{departureTime}}",
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              verticalContentAlignment: "center",
              items: [
                {
                  type: "Image",
                  url: "https://adaptivecards.io/content/airplane.png",
                  size: "small",
                  altText: "Flight direction arrow",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "ARRIVE",
                  size: "small",
                  isSubtle: true,
                  horizontalAlignment: "right",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{arrivalCity}}",
                  size: "extraLarge",
                  weight: "bolder",
                  spacing: "none",
                  horizontalAlignment: "right",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{arrivalTime}}",
                  spacing: "none",
                  horizontalAlignment: "right",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "FactSet",
          facts: [
            { title: "Terminal", value: "{{terminal}}" },
            { title: "Gate", value: "{{gate}}" },
            { title: "Boarding", value: "{{boardingTime}}" },
            { title: "Aircraft", value: "{{aircraft}}" },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Check In",
          verb: "checkIn",
          style: "positive",
        },
        {
          type: "Action.OpenUrl",
          title: "View on Map",
          url: "{{trackingUrl}}",
        },
      ],
    },
    example: "flight-status.json",
  };
}

/**
 * Build an order confirmation card pattern
 */
function orderConfirmationPattern(): LayoutPattern {
  return {
    name: "order-confirmation",
    description: "Order confirmation with product details, summary, and tracking",
    intent: ["display", "notification"],
    elements: ["TextBlock", "Container", "ColumnSet", "FactSet", "Image"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "good",
          bleed: true,
          items: [
            {
              type: "TextBlock",
              text: "\u2705 Order Confirmed",
              size: "large",
              weight: "bolder",
              color: "light",
              wrap: true,
              style: "heading",
            },
            {
              type: "TextBlock",
              text: "Thank you for your purchase!",
              color: "light",
              spacing: "none",
              wrap: true,
            },
          ],
        },
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{productImageUrl}}",
                      size: "medium",
                      altText: "{{productName}} product image",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{productName}}",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "Qty: {{quantity}}",
                      isSubtle: true,
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{price}}",
                      weight: "bolder",
                      spacing: "small",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "FactSet",
              facts: [
                { title: "Order Number", value: "{{orderNumber}}" },
                { title: "Total", value: "{{total}}" },
                { title: "Shipping", value: "{{shippingMethod}}" },
                { title: "Estimated Delivery", value: "{{estimatedDelivery}}" },
                { title: "Shipping Address", value: "{{shippingAddress}}" },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Track Order",
          verb: "trackOrder",
        },
        {
          type: "Action.OpenUrl",
          title: "View Receipt",
          url: "{{receiptUrl}}",
        },
      ],
    },
    example: "order-confirmation.json",
  };
}

/**
 * Build a weather card pattern
 */
function weatherPattern(): LayoutPattern {
  return {
    name: "weather",
    description: "Weather card with current conditions and multi-day forecast",
    intent: ["display"],
    elements: ["ColumnSet", "TextBlock", "Image", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{city}}",
          size: "large",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{conditionIconUrl}}",
                  size: "large",
                  altText: "{{conditionText}} weather icon",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              verticalContentAlignment: "center",
              items: [
                {
                  type: "TextBlock",
                  text: "{{currentTemp}}\u00b0",
                  size: "extraLarge",
                  weight: "bolder",
                  spacing: "none",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{conditionText}}",
                  isSubtle: true,
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              verticalContentAlignment: "center",
              items: [
                {
                  type: "TextBlock",
                  text: "H: {{highTemp}}\u00b0",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "L: {{lowTemp}}\u00b0",
                  spacing: "none",
                  isSubtle: true,
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "Humidity: {{humidity}}%",
                  size: "small",
                  isSubtle: true,
                  spacing: "small",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "TextBlock",
              text: "3-Day Forecast",
              weight: "bolder",
              spacing: "medium",
              wrap: true,
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{day1Name}}",
                      horizontalAlignment: "center",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "Image",
                      url: "{{day1IconUrl}}",
                      size: "small",
                      horizontalAlignment: "center",
                      altText: "{{day1Condition}} weather icon",
                    },
                    {
                      type: "TextBlock",
                      text: "{{day1High}}\u00b0 / {{day1Low}}\u00b0",
                      horizontalAlignment: "center",
                      size: "small",
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{day2Name}}",
                      horizontalAlignment: "center",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "Image",
                      url: "{{day2IconUrl}}",
                      size: "small",
                      horizontalAlignment: "center",
                      altText: "{{day2Condition}} weather icon",
                    },
                    {
                      type: "TextBlock",
                      text: "{{day2High}}\u00b0 / {{day2Low}}\u00b0",
                      horizontalAlignment: "center",
                      size: "small",
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{day3Name}}",
                      horizontalAlignment: "center",
                      weight: "bolder",
                      wrap: true,
                    },
                    {
                      type: "Image",
                      url: "{{day3IconUrl}}",
                      size: "small",
                      horizontalAlignment: "center",
                      altText: "{{day3Condition}} weather icon",
                    },
                    {
                      type: "TextBlock",
                      text: "{{day3High}}\u00b0 / {{day3Low}}\u00b0",
                      horizontalAlignment: "center",
                      size: "small",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    example: "weather.json",
  };
}

/**
 * Build a calendar event card pattern
 */
function calendarEventPattern(): LayoutPattern {
  return {
    name: "calendar-event",
    description: "Calendar event card with date, time, location, organizer, and attendees",
    intent: ["notification", "display"],
    elements: ["TextBlock", "ColumnSet", "FactSet", "Container"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "accent",
          bleed: true,
          items: [
            {
              type: "TextBlock",
              text: "{{eventTitle}}",
              size: "large",
              weight: "bolder",
              color: "light",
              wrap: true,
              style: "heading",
            },
          ],
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "TextBlock",
                  text: "{{dayOfWeek}}",
                  size: "small",
                  isSubtle: true,
                  horizontalAlignment: "center",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{dayNumber}}",
                  size: "extraLarge",
                  weight: "bolder",
                  horizontalAlignment: "center",
                  spacing: "none",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "{{month}}",
                  size: "small",
                  isSubtle: true,
                  horizontalAlignment: "center",
                  spacing: "none",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "FactSet",
                  facts: [
                    { title: "Time", value: "{{startTime}} \u2013 {{endTime}}" },
                    { title: "Location", value: "{{location}}" },
                    { title: "Organizer", value: "{{organizer}}" },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "TextBlock",
              text: "Attendees",
              weight: "bolder",
              wrap: true,
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{attendee1Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{attendee1Name}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{attendee2Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{attendee2Name}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{attendee3Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{attendee3Name}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{additionalAttendeesText}}",
                      isSubtle: true,
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Join Meeting",
          verb: "joinMeeting",
          style: "positive",
        },
        {
          type: "Action.Execute",
          title: "Decline",
          verb: "declineEvent",
          style: "destructive",
        },
        {
          type: "Action.Execute",
          title: "Tentative",
          verb: "tentativeEvent",
        },
      ],
    },
    example: "calendar-event.json",
  };
}

/**
 * Build a pull request card pattern
 */
function pullRequestPattern(): LayoutPattern {
  return {
    name: "pull-request",
    description: "Pull request card with author, stats, reviewers, and merge actions",
    intent: ["display", "notification"],
    elements: ["TextBlock", "ColumnSet", "FactSet", "Container", "Image"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: "{{prTitle}}",
              size: "medium",
              weight: "bolder",
              wrap: true,
              style: "heading",
            },
            {
              type: "TextBlock",
              text: "{{repo}} \u2022 {{baseBranch}} \u2190 {{headBranch}}",
              isSubtle: true,
              spacing: "none",
              wrap: true,
            },
          ],
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "Image",
                  url: "{{authorAvatar}}",
                  size: "small",
                  style: "person",
                  altText: "{{authorName}} avatar",
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              verticalContentAlignment: "center",
              items: [
                {
                  type: "TextBlock",
                  text: "{{authorName}}",
                  weight: "bolder",
                  wrap: true,
                },
                {
                  type: "TextBlock",
                  text: "opened {{timeAgo}}",
                  isSubtle: true,
                  spacing: "none",
                  size: "small",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              verticalContentAlignment: "center",
              items: [
                {
                  type: "TextBlock",
                  text: "{{prState}}",
                  weight: "bolder",
                  color: "{{prStateColor}}",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "ColumnSet",
          separator: true,
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "TextBlock",
                  text: "{{filesChanged}} files changed",
                  size: "small",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "TextBlock",
                  text: "+{{additions}}",
                  size: "small",
                  color: "good",
                  wrap: true,
                },
              ],
            },
            {
              type: "Column",
              width: "auto",
              items: [
                {
                  type: "TextBlock",
                  text: "-{{deletions}}",
                  size: "small",
                  color: "attention",
                  wrap: true,
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "TextBlock",
              text: "Reviewers",
              weight: "bolder",
              size: "small",
              wrap: true,
            },
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{reviewer1Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{reviewer1Name}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{reviewer2Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{reviewer2Name}}",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{reviewStatus}}",
                      isSubtle: true,
                      size: "small",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Approve",
          verb: "approvePR",
          style: "positive",
        },
        {
          type: "Action.Execute",
          title: "Request Changes",
          verb: "requestChanges",
          style: "destructive",
        },
        {
          type: "Action.ShowCard",
          title: "Comment",
          card: {
            type: "AdaptiveCard",
            version: "1.6",
            body: [
              {
                type: "Input.Text",
                id: "prComment",
                label: "Add a comment",
                isMultiline: true,
                placeholder: "Leave a review comment...",
              },
            ],
            actions: [
              {
                type: "Action.Execute",
                title: "Submit Comment",
                verb: "commentPR",
              },
            ],
          },
        },
      ],
    },
    example: "pull-request.json",
  };
}

/**
 * Build an incident alert card pattern
 */
function incidentAlertPattern(): LayoutPattern {
  return {
    name: "incident-alert",
    description: "Incident alert card with severity, impact details, and response actions",
    intent: ["notification", "status"],
    elements: ["Container", "TextBlock", "FactSet", "ColumnSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "attention",
          bleed: true,
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "auto",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "Image",
                      url: "https://adaptivecards.io/content/warning.png",
                      size: "small",
                      altText: "Incident severity {{severity}} icon",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  verticalContentAlignment: "center",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{severity}} INCIDENT",
                      size: "medium",
                      weight: "bolder",
                      color: "light",
                      wrap: true,
                      style: "heading",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          items: [
            {
              type: "TextBlock",
              text: "{{incidentTitle}}",
              size: "medium",
              weight: "bolder",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: "{{incidentDescription}}",
              wrap: true,
              isSubtle: true,
            },
          ],
        },
        {
          type: "FactSet",
          facts: [
            { title: "Service", value: "{{affectedService}}" },
            { title: "Started", value: "{{startedAt}}" },
            { title: "Duration", value: "{{duration}}" },
            { title: "Impact", value: "{{impactSummary}}" },
            { title: "On-Call", value: "{{onCallEngineer}}" },
            { title: "Incident ID", value: "{{incidentId}}" },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "TextBlock",
              text: "Recent Updates",
              weight: "bolder",
              size: "small",
              wrap: true,
            },
            {
              type: "TextBlock",
              text: "{{latestUpdate}}",
              isSubtle: true,
              wrap: true,
              size: "small",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Acknowledge",
          verb: "acknowledgeIncident",
          style: "positive",
        },
        {
          type: "Action.Execute",
          title: "Escalate",
          verb: "escalateIncident",
          style: "destructive",
        },
        {
          type: "Action.OpenUrl",
          title: "View in Dashboard",
          url: "{{incidentUrl}}",
        },
      ],
    },
    example: "incident-alert.json",
  };
}

/**
 * Build a survey/poll card pattern
 */
function surveyPollPattern(): LayoutPattern {
  return {
    name: "survey-poll",
    description: "Survey or poll card with multiple questions and optional comments",
    intent: ["form"],
    elements: ["TextBlock", "Input.ChoiceSet", "Input.Text", "ActionSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{surveyTitle}}",
          size: "large",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{surveyDescription}}",
          isSubtle: true,
          wrap: true,
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "Input.ChoiceSet",
              id: "question1",
              label: "{{question1Text}}",
              style: "expanded",
              isRequired: true,
              choices: [
                { title: "Strongly Agree", value: "5" },
                { title: "Agree", value: "4" },
                { title: "Neutral", value: "3" },
                { title: "Disagree", value: "2" },
                { title: "Strongly Disagree", value: "1" },
              ],
            },
          ],
        },
        {
          type: "Container",
          items: [
            {
              type: "Input.ChoiceSet",
              id: "question2",
              label: "{{question2Text}}",
              style: "expanded",
              isRequired: true,
              choices: [
                { title: "Excellent", value: "excellent" },
                { title: "Good", value: "good" },
                { title: "Average", value: "average" },
                { title: "Poor", value: "poor" },
              ],
            },
          ],
        },
        {
          type: "Container",
          items: [
            {
              type: "Input.ChoiceSet",
              id: "question3",
              label: "{{question3Text}}",
              style: "compact",
              isMultiSelect: true,
              choices: [
                { title: "{{option3a}}", value: "a" },
                { title: "{{option3b}}", value: "b" },
                { title: "{{option3c}}", value: "c" },
                { title: "{{option3d}}", value: "d" },
              ],
            },
          ],
        },
        {
          type: "Input.Text",
          id: "additionalComments",
          label: "Additional comments (optional)",
          isMultiline: true,
          placeholder: "Share any other feedback...",
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Submit Survey",
          verb: "submitSurvey",
          style: "positive",
        },
      ],
    },
    example: "survey-poll.json",
  };
}

/**
 * Build a wizard/multi-step form card pattern
 */
function wizardStepPattern(): LayoutPattern {
  return {
    name: "wizard-step",
    description: "Multi-step wizard form using Action.ShowCard to reveal subsequent steps",
    intent: ["form"],
    elements: ["TextBlock", "Container", "Input.Text", "Input.ChoiceSet", "ActionSet"],
    dataShape: "single-object",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "Container",
          style: "emphasis",
          bleed: true,
          items: [
            {
              type: "TextBlock",
              text: "{{wizardTitle}}",
              size: "large",
              weight: "bolder",
              wrap: true,
              style: "heading",
            },
            {
              type: "TextBlock",
              text: "Step 1 of {{totalSteps}} \u2014 {{step1Title}}",
              isSubtle: true,
              spacing: "none",
              wrap: true,
            },
          ],
        },
        {
          type: "Container",
          items: [
            {
              type: "Input.Text",
              id: "step1_firstName",
              label: "First Name",
              isRequired: true,
              placeholder: "Enter your first name",
            },
            {
              type: "Input.Text",
              id: "step1_lastName",
              label: "Last Name",
              isRequired: true,
              placeholder: "Enter your last name",
            },
            {
              type: "Input.Text",
              id: "step1_email",
              label: "Email Address",
              isRequired: true,
              placeholder: "you@example.com",
              style: "email",
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.ShowCard",
          title: "Next \u2192",
          card: {
            type: "AdaptiveCard",
            version: "1.6",
            body: [
              {
                type: "Container",
                style: "emphasis",
                items: [
                  {
                    type: "TextBlock",
                    text: "Step 2 of {{totalSteps}} \u2014 {{step2Title}}",
                    weight: "bolder",
                    wrap: true,
                  },
                ],
              },
              {
                type: "Input.ChoiceSet",
                id: "step2_department",
                label: "Department",
                style: "compact",
                isRequired: true,
                choices: [
                  { title: "Engineering", value: "engineering" },
                  { title: "Design", value: "design" },
                  { title: "Product", value: "product" },
                  { title: "Marketing", value: "marketing" },
                  { title: "Sales", value: "sales" },
                ],
              },
              {
                type: "Input.ChoiceSet",
                id: "step2_role",
                label: "Role",
                style: "compact",
                isRequired: true,
                choices: [
                  { title: "Individual Contributor", value: "ic" },
                  { title: "Manager", value: "manager" },
                  { title: "Director", value: "director" },
                  { title: "VP", value: "vp" },
                ],
              },
              {
                type: "Input.Text",
                id: "step2_notes",
                label: "Additional Notes",
                isMultiline: true,
                placeholder: "Any additional information...",
              },
            ],
            actions: [
              {
                type: "Action.Execute",
                title: "Submit",
                verb: "submitWizard",
                style: "positive",
              },
            ],
          },
        },
      ],
    },
    example: "wizard-step.json",
  };
}

/**
 * Build a pricing table card pattern
 */
function pricingTablePattern(): LayoutPattern {
  return {
    name: "pricing-table",
    description: "Pricing comparison table with tiered plans side by side",
    intent: ["display"],
    elements: ["ColumnSet", "TextBlock", "Container"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "large",
          weight: "bolder",
          horizontalAlignment: "center",
          wrap: true,
          style: "heading",
        },
        {
          type: "TextBlock",
          text: "{{subtitle}}",
          isSubtle: true,
          horizontalAlignment: "center",
          wrap: true,
        },
        {
          type: "ColumnSet",
          columns: [
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "default",
                  items: [
                    {
                      type: "TextBlock",
                      text: "Basic",
                      size: "medium",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{basicPrice}}",
                      size: "extraLarge",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      color: "accent",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "/month",
                      size: "small",
                      isSubtle: true,
                      horizontalAlignment: "center",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "\u2022 {{basicFeature1}}\n\u2022 {{basicFeature2}}\n\u2022 {{basicFeature3}}",
                      size: "small",
                      wrap: true,
                      spacing: "medium",
                    },
                  ],
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "accent",
                  items: [
                    {
                      type: "TextBlock",
                      text: "Pro",
                      size: "medium",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{proPrice}}",
                      size: "extraLarge",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      color: "accent",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "/month",
                      size: "small",
                      isSubtle: true,
                      horizontalAlignment: "center",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "\u2022 {{proFeature1}}\n\u2022 {{proFeature2}}\n\u2022 {{proFeature3}}\n\u2022 {{proFeature4}}",
                      size: "small",
                      wrap: true,
                      spacing: "medium",
                    },
                  ],
                },
              ],
            },
            {
              type: "Column",
              width: "stretch",
              items: [
                {
                  type: "Container",
                  style: "default",
                  items: [
                    {
                      type: "TextBlock",
                      text: "Enterprise",
                      size: "medium",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{enterprisePrice}}",
                      size: "extraLarge",
                      weight: "bolder",
                      horizontalAlignment: "center",
                      color: "accent",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "/month",
                      size: "small",
                      isSubtle: true,
                      horizontalAlignment: "center",
                      spacing: "none",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "\u2022 {{enterpriseFeature1}}\n\u2022 {{enterpriseFeature2}}\n\u2022 {{enterpriseFeature3}}\n\u2022 {{enterpriseFeature4}}\n\u2022 {{enterpriseFeature5}}",
                      size: "small",
                      wrap: true,
                      spacing: "medium",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Choose Basic",
          verb: "selectPlan",
          data: { plan: "basic" },
        },
        {
          type: "Action.Execute",
          title: "Choose Pro",
          verb: "selectPlan",
          style: "positive",
          data: { plan: "pro" },
        },
        {
          type: "Action.Execute",
          title: "Contact Sales",
          verb: "contactSales",
          data: { plan: "enterprise" },
        },
      ],
    },
    example: "pricing-table.json",
  };
}

/**
 * Build a timeline/activity feed card pattern
 */
function timelineActivityPattern(): LayoutPattern {
  return {
    name: "timeline-activity",
    description: "Activity feed timeline with timestamped entries and actor avatars",
    intent: ["display", "list"],
    elements: ["Container", "ColumnSet", "TextBlock", "Image"],
    dataShape: "array",
    template: {
      type: "AdaptiveCard",
      version: "1.6",
      body: [
        {
          type: "TextBlock",
          text: "{{title}}",
          size: "medium",
          weight: "bolder",
          wrap: true,
          style: "heading",
        },
        {
          type: "Container",
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "60px",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{activity1Time}}",
                      size: "small",
                      isSubtle: true,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{activity1Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{activity1Actor}} avatar",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "**{{activity1Actor}}** {{activity1Action}}",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{activity1Detail}}",
                      isSubtle: true,
                      size: "small",
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "60px",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{activity2Time}}",
                      size: "small",
                      isSubtle: true,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{activity2Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{activity2Actor}} avatar",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "**{{activity2Actor}}** {{activity2Action}}",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{activity2Detail}}",
                      isSubtle: true,
                      size: "small",
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "60px",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{activity3Time}}",
                      size: "small",
                      isSubtle: true,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{activity3Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{activity3Actor}} avatar",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "**{{activity3Actor}}** {{activity3Action}}",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{activity3Detail}}",
                      isSubtle: true,
                      size: "small",
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          type: "Container",
          separator: true,
          items: [
            {
              type: "ColumnSet",
              columns: [
                {
                  type: "Column",
                  width: "60px",
                  items: [
                    {
                      type: "TextBlock",
                      text: "{{activity4Time}}",
                      size: "small",
                      isSubtle: true,
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "auto",
                  items: [
                    {
                      type: "Image",
                      url: "{{activity4Avatar}}",
                      size: "small",
                      style: "person",
                      altText: "{{activity4Actor}} avatar",
                    },
                  ],
                },
                {
                  type: "Column",
                  width: "stretch",
                  items: [
                    {
                      type: "TextBlock",
                      text: "**{{activity4Actor}}** {{activity4Action}}",
                      wrap: true,
                    },
                    {
                      type: "TextBlock",
                      text: "{{activity4Detail}}",
                      isSubtle: true,
                      size: "small",
                      spacing: "none",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
      actions: [
        {
          type: "Action.Execute",
          title: "Load More",
          verb: "loadMoreActivity",
        },
      ],
    },
    example: "timeline-activity.json",
  };
}

// ─── Pattern Registry ────────────────────────────────────────────────────────

const ALL_PATTERNS: LayoutPattern[] = [
  notificationPattern(),
  approvalPattern(),
  dataTablePattern(),
  factsPattern(),
  imageGalleryPattern(),
  dashboardPattern(),
  inputFormPattern(),
  statusUpdatePattern(),
  listPattern(),
  profilePattern(),
  chartPattern(),
  flightStatusPattern(),
  orderConfirmationPattern(),
  weatherPattern(),
  calendarEventPattern(),
  pullRequestPattern(),
  incidentAlertPattern(),
  surveyPollPattern(),
  wizardStepPattern(),
  pricingTablePattern(),
  timelineActivityPattern(),
];

/**
 * Get all available layout patterns
 */
export function getAllPatterns(): LayoutPattern[] {
  return ALL_PATTERNS;
}

/**
 * Find the best matching pattern for a given intent
 */
export function findPatternByIntent(intent: CardIntent): LayoutPattern | undefined {
  return ALL_PATTERNS.find((p) => p.intent.includes(intent));
}

/**
 * Find pattern by name
 */
export function findPatternByName(name: string): LayoutPattern | undefined {
  return ALL_PATTERNS.find((p) => p.name === name);
}

/**
 * Score patterns against a description for best match
 */
export function scorePatterns(
  description: string,
): Array<{ pattern: LayoutPattern; score: number }> {
  const lower = description.toLowerCase();
  const keywords: Record<string, string[]> = {
    notification: ["notify", "notification", "alert", "message", "announce"],
    approval: ["approve", "approval", "reject", "request", "authorize", "sign off"],
    "data-table": ["table", "data", "rows", "columns", "grid", "spreadsheet", "tabular"],
    facts: ["detail", "info", "summary", "key-value", "properties", "metadata", "facts"],
    "image-gallery": ["image", "gallery", "photo", "picture", "portfolio"],
    dashboard: ["dashboard", "metrics", "kpi", "overview", "summary", "stats"],
    "input-form": ["form", "input", "survey", "questionnaire", "collect", "register", "signup"],
    "status-update": ["status", "update", "progress", "tracking", "activity"],
    list: ["list", "items", "todo", "tasks", "menu", "options", "catalog"],
    profile: ["profile", "person", "contact", "user", "member", "employee", "team"],
    chart: ["chart", "graph", "visualization", "plot", "bar chart", "pie chart", "analytics"],
    "flight-status": [
      "flight", "airline", "boarding", "departure", "arrival", "gate", "terminal", "travel",
      "check-in", "aviation",
    ],
    "order-confirmation": [
      "order", "purchase", "confirmation", "receipt", "shipping", "delivery", "tracking",
      "ecommerce", "buy", "checkout",
    ],
    weather: [
      "weather", "forecast", "temperature", "rain", "sunny", "cloudy", "humidity", "climate",
      "wind",
    ],
    "calendar-event": [
      "calendar", "event", "meeting", "invite", "schedule", "appointment", "attendee",
      "organizer", "rsvp",
    ],
    "pull-request": [
      "pull request", "pr", "merge", "branch", "code review", "commit", "diff", "repository",
      "github", "devops",
    ],
    "incident-alert": [
      "incident", "outage", "severity", "on-call", "escalate", "downtime", "pagerduty",
      "monitor", "sev1", "sev2",
    ],
    "survey-poll": [
      "survey", "poll", "questionnaire", "feedback", "rating", "vote", "opinion",
    ],
    "wizard-step": [
      "wizard", "step", "multi-step", "onboarding", "registration", "setup", "walkthrough",
    ],
    "pricing-table": [
      "pricing", "plan", "tier", "subscription", "cost", "package", "compare", "enterprise",
      "basic", "pro",
    ],
    "timeline-activity": [
      "timeline", "activity", "feed", "history", "log", "audit", "changelog", "stream",
    ],
  };

  return ALL_PATTERNS.map((pattern) => {
    let score = 0;
    const patternKeywords = keywords[pattern.name] || [];
    for (const kw of patternKeywords) {
      if (lower.includes(kw)) score += 10;
    }
    // Partial matches on pattern description
    const descWords = pattern.description.toLowerCase().split(/\s+/);
    for (const word of descWords) {
      if (word.length > 3 && lower.includes(word)) score += 2;
    }
    return { pattern, score };
  })
    .sort((a, b) => b.score - a.score);
}
