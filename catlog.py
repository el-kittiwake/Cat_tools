#!/usr/bin/env python3

## catlog.py
# Frontend script for Google sheets apps script
# Tool to log foster cat related health/wellbeing/food activity

## Includes
from urllib.parse import urlencode   # urlencode key=value pairs into valid url
import urllib.request # Requests the /exec
import urllib.error   # Handle errors cleanly
import sys            # exit
import argparse       # set up and parse script arguments
import os             # read environment variables
import time           # reqID, optional but consistent with mobile
import json           # Parse and print response from sheet read operation

## type converter for positive int, required for count/-l to notify on <=0 values
# If the cast int(text) fails the first exception is raised
# Otherwise it is checked for 1 or more which raises its own exception
def positive_int(text):
    try:
        n = int(text)
    except ValueError:
        raise argparse.ArgumentTypeError("must be a whole number")
    if n < 1:
        raise argparse.ArgumentTypeError("must be at least 1")
    return n

## Function to print error and exit
# sys.exit() defaults to 0, but with error string, defaults to 1.
def fail(msg):
    sys.exit(f"cat*log error: {msg}")

## Function to fetch URL and handle errors and problems
# https://docs.python.org/3/howto/urllib2.html
# https://www.geeksforgeeks.org/python/handling-oserror-exception-in-python/
# urlencode creates a URL parameter string
# .decode("utf-8") converts raw bytes returned from f.read() into string,
#     prevents type error
# Three exception catches for different levels of error.
# if body.startswith() only ever fires if no exception occurs and body exists
def fetch(base_url, params):
    req_params = urlencode(params)
    url = base_url + "?" + req_params

    try:
        with urllib.request.urlopen(url, timeout=20) as f:
            body = f.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        fail(f"HTTP: {e.code}")
    except urllib.error.URLError as e:
        fail(f"network: {e.reason}")
    except OSError as e:
        fail(f"system: {e}")

    if body.startswith("ERROR:"):
        fail(body)

    return body

## Function to perform the add action
def add(url, args):
    params = {'message': args.message, 'tag': args.tag, 'note': args.note, 'reqId' : int(time.time() * 1000)}
    body = fetch(url, params)

    if not body.startswith("OK"):
        fail(f"unexpected response: {body[:200]}")
    print(f"Write success.\nAdded message: {args.message}\n       tagged: {args.tag}\n         note: {args.note}")

    if args.logged:
        print(f'Please wait, fetching {args.logged} previous entries.')
        show(url, args)

## Function to perform the show action
# json.loads() for strings rather than json.load() for files
# for loop through entries printing each to terminal
def show(url, args):
    params = {'read': 1, 'rows' : args.logged}
    body = fetch(url, params)

    try:
        entries = json.loads(body)
    except json.JSONDecodeError:
        fail(f"unexpected response: {body[:200]}")
    
    if not entries:
        print("No entries yet.")
        return

    print(f'Fetched {len(entries)} previous entries.')
    print("   Date    |   Time   |    Tag     |             Entry              |    Note")
    for i in entries:
        print(f"{i['date']:<10} | {i['time']:<8} | {i['tag']:<10} | {i['message']:<30} | {i['note']}")

## Function to build the script's argument parser
# https://thepythoncode.com/article/how-to-use-argparse-in-python
# Using sub parsers in order to be able to require message for adding, but also
#   be able to fetch the latest X entries alone or as part of an addition.
def build_parser():
    ## Build script arguments using argparse and subparsers
    # Global and sub parsers
    parser = argparse.ArgumentParser(prog='catlog', description='Log cat health events to a Google sheet. Uses a script URL interfacing with a backend Apps Script.')
    sub_parsers = parser.add_subparsers(dest='command', required=True,
                                        help="Add a new entry or show X entries.")

    # Main parser to handle adding new entries
    add_p = sub_parsers.add_parser('add', help='Add a new entry to the spreadsheet.')
    add_p.add_argument('message', help='The main body of the entry.')
    add_p.add_argument('-t', '--tag', metavar='TAG', default='',
                    help='Entry tag. Optional but recommended.',
                    choices=['food', 'medication', 'weight', 'puke', 'behaviour', 'action', 'event'])
    add_p.add_argument('-n', '--note', default='', help='Entry note. Optional.')
    add_p.add_argument('-l', '--logged', type=positive_int, metavar='X',
                    help='After adding a new entry, also show X previous entries. Optional.')
    add_p.set_defaults(func=add)

    # Show parser, to handle fetching the X most recent entries
    show_p = sub_parsers.add_parser('show', help="Show X most recent spreadsheet entries.")
    show_p.add_argument('logged', nargs='?', type=positive_int, default=3,
                        metavar='X', help='Show X previous entries.')
    show_p.set_defaults(func=show)

    return parser.parse_args()

## main
# Call parser function, fetch environment variables, call chosen function
if __name__ == "__main__":
    args = build_parser()

    ## Read environment variables
    # Exit if not found
    env_url = os.getenv('CATLOG_URL')
    if not env_url:
        fail("CATLOG_URL not set")

    args.func(env_url, args)
