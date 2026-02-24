#!/usr/bin/env python3
"""
Simple email client using Python's standard library.
No external dependencies required.
"""

import imaplib
import smtplib
import ssl
import json
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import decode_header
from datetime import datetime

CONFIG_FILE = os.path.expanduser("~/.config/pyemail/config.json")

def load_config():
    """Load email configuration."""
    if not os.path.exists(CONFIG_FILE):
        return None
    with open(CONFIG_FILE) as f:
        return json.load(f)

def save_config(config):
    """Save email configuration."""
    os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def setup_config(email, smtp_host, smtp_port, smtp_user, smtp_pass,
                 imap_host, imap_port, imap_user, imap_pass):
    """Setup email configuration."""
    config = {
        "email": email,
        "smtp": {
            "host": smtp_host,
            "port": int(smtp_port),
            "username": smtp_user,
            "password": smtp_pass
        },
        "imap": {
            "host": imap_host,
            "port": int(imap_port),
            "username": imap_user,
            "password": imap_pass
        }
    }
    save_config(config)
    return config

def send_email(to, subject, body, html=None):
    """Send an email."""
    config = load_config()
    if not config:
        raise ValueError("Email not configured. Run setup first.")
    
    msg = MIMEMultipart('alternative')
    msg['From'] = config['email']
    msg['To'] = to
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body, 'plain'))
    if html:
        msg.attach(MIMEText(html, 'html'))
    
    context = ssl.create_default_context()
    port = config['smtp']['port']
    
    # Port 465 uses SSL directly, others use STARTTLS
    if port == 465:
        with smtplib.SMTP_SSL(config['smtp']['host'], port, context=context) as server:
            server.login(config['smtp']['username'], config['smtp']['password'])
            server.send_message(msg)
    else:
        with smtplib.SMTP(config['smtp']['host'], port) as server:
            server.starttls(context=context)
            server.login(config['smtp']['username'], config['smtp']['password'])
            server.send_message(msg)
    
    return True

def list_emails(folder="INBOX", limit=10):
    """List emails from a folder."""
    config = load_config()
    if not config:
        raise ValueError("Email not configured. Run setup first.")
    
    context = ssl.create_default_context()
    
    with imaplib.IMAP4_SSL(config['imap']['host'], config['imap']['port'], ssl_context=context) as mail:
        mail.login(config['imap']['username'], config['imap']['password'])
        mail.select(folder)
        
        _, data = mail.search(None, 'ALL')
        email_ids = data[0].split()
        
        emails = []
        for eid in reversed(email_ids[-limit:]):
            _, msg_data = mail.fetch(eid, '(RFC822)')
            raw_email = msg_data[0][1]
            
            from email import message_from_bytes
            msg = message_from_bytes(raw_email)
            
            subject = msg['Subject'] or '(no subject)'
            from_addr = msg['From'] or '(unknown)'
            date = msg['Date'] or ''
            
            # Try to decode subject
            try:
                decoded = decode_header(subject)
                subject = ''
                for part, charset in decoded:
                    if isinstance(part, bytes):
                        subject += part.decode(charset or 'utf-8', errors='ignore')
                    else:
                        subject += part
            except:
                pass
            
            emails.append({
                'id': eid.decode(),
                'subject': subject,
                'from': from_addr,
                'date': date
            })
        
        return emails

def read_email(email_id):
    """Read a specific email."""
    config = load_config()
    if not config:
        raise ValueError("Email not configured. Run setup first.")
    
    context = ssl.create_default_context()
    
    with imaplib.IMAP4_SSL(config['imap']['host'], config['imap']['port'], ssl_context=context) as mail:
        mail.login(config['imap']['username'], config['imap']['password'])
        mail.select('INBOX')
        
        _, msg_data = mail.fetch(email_id.encode(), '(RFC822)')
        raw_email = msg_data[0][1]
        
        from email import message_from_bytes
        msg = message_from_bytes(raw_email)
        
        # Extract body
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    except:
                        pass
                    break
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                pass
        
        return {
            'subject': msg['Subject'] or '(no subject)',
            'from': msg['From'] or '(unknown)',
            'to': msg['To'] or '',
            'date': msg['Date'] or '',
            'body': body
        }

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: pyemail <command> [args...]")
        print("Commands:")
        print("  setup <email> <smtp_host> <smtp_port> <smtp_user> <smtp_pass> <imap_host> <imap_port> <imap_user> <imap_pass>")
        print("  send <to> <subject> <body>")
        print("  list [limit]")
        print("  read <email_id>")
        sys.exit(1)
    
    cmd = sys.argv[1]
    
    if cmd == "setup" and len(sys.argv) == 11:
        setup_config(*sys.argv[2:11])
        print("Configuration saved.")
    
    elif cmd == "send" and len(sys.argv) >= 5:
        to = sys.argv[2]
        subject = sys.argv[3]
        body = sys.argv[4]
        send_email(to, subject, body)
        print(f"Email sent to {to}")
    
    elif cmd == "list":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
        emails = list_emails(limit=limit)
        for e in emails:
            print(f"{e['id']}: {e['from']} - {e['subject']}")
    
    elif cmd == "read" and len(sys.argv) == 3:
        email = read_email(sys.argv[2])
        print(f"From: {email['from']}")
        print(f"To: {email['to']}")
        print(f"Subject: {email['subject']}")
        print(f"Date: {email['date']}")
        print("-" * 40)
        print(email['body'])
    
    else:
        print("Invalid command or arguments.")
        sys.exit(1)
