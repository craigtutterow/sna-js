sna-js
======

This repository contains javascript code that interact with social network APIs, generate D3.js visualizations, and calculate relevant metrics for **social network analysis**. 

You can see it in use at: http://socilab.com. Socilab is a social network utility that allows users to visualize, analyze, and download data on their LinkedIn network. It has been used for in class tutorials at a number of universities - including Carnegie Mellon, Cornell, Dartmouth, London Business School, University of Sydney, among others, and is featured on datasciencemasters.org.

I am actively developing this as users request more features and look forward to collaborating to anyone who shares an interest in **making network data and analysis more accessible to end users**.

LinkedIn
------
### sna-js.js:
Takes in 2D adjacency matrix from socilab-linkedin.js and performs egocentric network calculations for social network analysis.

### d3js-linkedin.js:
A dynamic and interactive visualization of a user's LinkedIn network using the d3js library, with options to enable/disable connections to ego and color nodes by industry.

### socilab-linkedin.js:
Methods for interacting with LinkedIn API to gather network data for display, analysis, and download by user.

**Note on LinkedIn API functionality**: LinkedIn's public API no longer supports the related-connections request that this script relies on. LinkedIn was courteous enough to extend socilab's access to the prior functionality while our partnership application is pending review. I do not have a timeline for when the application will be processed, but any contributions made here in the meantime can be implemented on the public site so long as they comply with the terms.

----
**Author**: *Craig Tutterow*, [@craigtutterow](https://github.com/craigtutterow)

Contributors: *Lars Juel Nielsen* ([@LJNielsenDk](https://github.com/LJNielsenDk)), *Kushal Likhi* ([@kushal-likhi](https://github.com/kushal-likhi)) 
