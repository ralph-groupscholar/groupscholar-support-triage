#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

#define MAX_LINE 2048
#define MAX_FIELD 256
#define MAX_RECORDS 20000

typedef struct {
    char ticket_id[MAX_FIELD];
    char scholar_id[MAX_FIELD];
    char category[MAX_FIELD];
    int urgency;
    int impact;
    char status[MAX_FIELD];
    char channel[MAX_FIELD];
    char created_at[MAX_FIELD];
    char last_update[MAX_FIELD];
    char owner[MAX_FIELD];
    int age_days;
    int stale_days;
    int is_stale;
    int unassigned;
    int sla_risk;
    double score;
} Ticket;

typedef struct {
    char key[MAX_FIELD];
    int count;
} CountEntry;

static int parse_csv_line(char *line, char fields[][MAX_FIELD], int max_fields) {
    int field = 0;
    int i = 0;
    int j = 0;
    for (i = 0; line[i] != '\0' && field < max_fields; i++) {
        if (line[i] == '\n' || line[i] == '\r') {
            break;
        }
        if (line[i] == ',') {
            fields[field][j] = '\0';
            field++;
            j = 0;
        } else {
            if (j < MAX_FIELD - 1) {
                fields[field][j++] = line[i];
            }
        }
    }
    if (field < max_fields) {
        fields[field][j] = '\0';
        field++;
    }
    return field;
}

static int parse_int(const char *s, int fallback) {
    if (s == NULL || *s == '\0') {
        return fallback;
    }
    char *end = NULL;
    long v = strtol(s, &end, 10);
    if (end == s) {
        return fallback;
    }
    return (int)v;
}

static int parse_date(const char *s, struct tm *out) {
    if (s == NULL || strlen(s) < 10) {
        return 0;
    }
    int y = 0, m = 0, d = 0;
    if (sscanf(s, "%d-%d-%d", &y, &m, &d) != 3) {
        return 0;
    }
    memset(out, 0, sizeof(struct tm));
    out->tm_year = y - 1900;
    out->tm_mon = m - 1;
    out->tm_mday = d;
    out->tm_isdst = -1;
    return 1;
}

static int days_between(const char *from, const char *to) {
    struct tm a, b;
    if (!parse_date(from, &a) || !parse_date(to, &b)) {
        return 0;
    }
    time_t ta = mktime(&a);
    time_t tb = mktime(&b);
    if (ta == (time_t)-1 || tb == (time_t)-1) {
        return 0;
    }
    double diff = difftime(tb, ta);
    return (int)(diff / 86400.0);
}

static void trim(char *s) {
    if (!s) return;
    size_t len = strlen(s);
    while (len > 0 && isspace((unsigned char)s[len - 1])) {
        s[len - 1] = '\0';
        len--;
    }
    while (*s && isspace((unsigned char)*s)) {
        memmove(s, s + 1, strlen(s));
    }
}

static void add_count(CountEntry *entries, int *count, const char *key) {
    if (key == NULL || *key == '\0') {
        return;
    }
    for (int i = 0; i < *count; i++) {
        if (strcmp(entries[i].key, key) == 0) {
            entries[i].count++;
            return;
        }
    }
    if (*count < 200) {
        strncpy(entries[*count].key, key, MAX_FIELD - 1);
        entries[*count].key[MAX_FIELD - 1] = '\0';
        entries[*count].count = 1;
        (*count)++;
    }
}

static int compare_ticket_score(const void *a, const void *b) {
    const Ticket *ta = (const Ticket *)a;
    const Ticket *tb = (const Ticket *)b;
    if (tb->score > ta->score) return 1;
    if (tb->score < ta->score) return -1;
    return 0;
}

static int compare_count_desc(const void *a, const void *b) {
    const CountEntry *ca = (const CountEntry *)a;
    const CountEntry *cb = (const CountEntry *)b;
    return cb->count - ca->count;
}

static void usage() {
    printf("groupscholar-support-triage\n");
    printf("Usage: support-triage <csv> [options]\n");
    printf("Options:\n");
    printf("  --json <path>       Write JSON report to path\n");
    printf("  --limit <n>         Limit action queue items (default 10)\n");
    printf("  --today <date>      Override today date (YYYY-MM-DD)\n");
    printf("  --stale-days <n>    Stale threshold in days since last update (default 10)\n");
    printf("  --sla-days <n>      SLA risk threshold in days since created (default 14)\n");
    printf("  --high-urgency <n>  Threshold for high urgency (default 4)\n");
    printf("  --high-impact <n>   Threshold for high impact (default 4)\n");
    printf("\nCSV columns:\n");
    printf("ticket_id,scholar_id,category,urgency,impact,status,channel,created_at,last_update,owner\n");
}

static void write_json(FILE *out, Ticket *tickets, int ticket_count,
                       int open_count, int closed_count,
                       int unassigned_count, int stale_count,
                       int high_urgency_count, int high_impact_count,
                       int sla_risk_count, int limit,
                       CountEntry *categories, int category_count,
                       CountEntry *channels, int channel_count) {
    fprintf(out, "{\n");
    fprintf(out, "  \"summary\": {\n");
    fprintf(out, "    \"open\": %d,\n", open_count);
    fprintf(out, "    \"closed\": %d,\n", closed_count);
    fprintf(out, "    \"unassigned\": %d,\n", unassigned_count);
    fprintf(out, "    \"stale\": %d,\n", stale_count);
    fprintf(out, "    \"high_urgency\": %d,\n", high_urgency_count);
    fprintf(out, "    \"high_impact\": %d,\n", high_impact_count);
    fprintf(out, "    \"sla_risk\": %d\n", sla_risk_count);
    fprintf(out, "  },\n");

    fprintf(out, "  \"top_categories\": [\n");
    for (int i = 0; i < category_count && i < 5; i++) {
        fprintf(out, "    {\"category\": \"%s\", \"count\": %d}%s\n",
                categories[i].key, categories[i].count,
                (i == category_count - 1 || i == 4) ? "" : ",");
    }
    fprintf(out, "  ],\n");

    fprintf(out, "  \"top_channels\": [\n");
    for (int i = 0; i < channel_count && i < 5; i++) {
        fprintf(out, "    {\"channel\": \"%s\", \"count\": %d}%s\n",
                channels[i].key, channels[i].count,
                (i == channel_count - 1 || i == 4) ? "" : ",");
    }
    fprintf(out, "  ],\n");

    fprintf(out, "  \"action_queue\": [\n");
    int written = 0;
    for (int i = 0; i < ticket_count && written < limit; i++) {
        if (strcmp(tickets[i].status, "closed") == 0) {
            continue;
        }
        fprintf(out, "    {\"ticket_id\": \"%s\", \"scholar_id\": \"%s\", \"category\": \"%s\", \"urgency\": %d, \"impact\": %d, \"age_days\": %d, \"stale_days\": %d, \"score\": %.2f, \"owner\": \"%s\"}%s\n",
                tickets[i].ticket_id,
                tickets[i].scholar_id,
                tickets[i].category,
                tickets[i].urgency,
                tickets[i].impact,
                tickets[i].age_days,
                tickets[i].stale_days,
                tickets[i].score,
                tickets[i].owner,
                (written == limit - 1 || i == ticket_count - 1) ? "" : ",");
        written++;
    }
    fprintf(out, "  ]\n");
    fprintf(out, "}\n");
}

int main(int argc, char **argv) {
    if (argc < 2) {
        usage();
        return 1;
    }

    const char *csv_path = NULL;
    const char *json_path = NULL;
    const char *today_override = NULL;
    int limit = 10;
    int stale_days_threshold = 10;
    int sla_days_threshold = 14;
    int high_urgency_threshold = 4;
    int high_impact_threshold = 4;

    csv_path = argv[1];

    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "--json") == 0 && i + 1 < argc) {
            json_path = argv[++i];
        } else if (strcmp(argv[i], "--limit") == 0 && i + 1 < argc) {
            limit = parse_int(argv[++i], limit);
        } else if (strcmp(argv[i], "--today") == 0 && i + 1 < argc) {
            today_override = argv[++i];
        } else if (strcmp(argv[i], "--stale-days") == 0 && i + 1 < argc) {
            stale_days_threshold = parse_int(argv[++i], stale_days_threshold);
        } else if (strcmp(argv[i], "--sla-days") == 0 && i + 1 < argc) {
            sla_days_threshold = parse_int(argv[++i], sla_days_threshold);
        } else if (strcmp(argv[i], "--high-urgency") == 0 && i + 1 < argc) {
            high_urgency_threshold = parse_int(argv[++i], high_urgency_threshold);
        } else if (strcmp(argv[i], "--high-impact") == 0 && i + 1 < argc) {
            high_impact_threshold = parse_int(argv[++i], high_impact_threshold);
        } else if (strcmp(argv[i], "--help") == 0) {
            usage();
            return 0;
        }
    }

    char today_str[16];
    if (today_override) {
        strncpy(today_str, today_override, sizeof(today_str) - 1);
        today_str[sizeof(today_str) - 1] = '\0';
    } else {
        time_t now = time(NULL);
        struct tm *tm_now = localtime(&now);
        strftime(today_str, sizeof(today_str), "%Y-%m-%d", tm_now);
    }

    FILE *fp = fopen(csv_path, "r");
    if (!fp) {
        fprintf(stderr, "Could not open CSV: %s\n", csv_path);
        return 1;
    }

    Ticket tickets[MAX_RECORDS];
    int ticket_count = 0;

    char line[MAX_LINE];
    int line_no = 0;
    while (fgets(line, sizeof(line), fp)) {
        line_no++;
        if (line_no == 1) {
            continue; // header
        }
        if (ticket_count >= MAX_RECORDS) {
            break;
        }
        char fields[10][MAX_FIELD];
        int field_count = parse_csv_line(line, fields, 10);
        if (field_count < 10) {
            continue;
        }
        Ticket *t = &tickets[ticket_count];
        memset(t, 0, sizeof(Ticket));
        strncpy(t->ticket_id, fields[0], MAX_FIELD - 1);
        strncpy(t->scholar_id, fields[1], MAX_FIELD - 1);
        strncpy(t->category, fields[2], MAX_FIELD - 1);
        t->urgency = parse_int(fields[3], 0);
        t->impact = parse_int(fields[4], 0);
        strncpy(t->status, fields[5], MAX_FIELD - 1);
        strncpy(t->channel, fields[6], MAX_FIELD - 1);
        strncpy(t->created_at, fields[7], MAX_FIELD - 1);
        strncpy(t->last_update, fields[8], MAX_FIELD - 1);
        strncpy(t->owner, fields[9], MAX_FIELD - 1);

        trim(t->ticket_id);
        trim(t->scholar_id);
        trim(t->category);
        trim(t->status);
        trim(t->channel);
        trim(t->created_at);
        trim(t->last_update);
        trim(t->owner);

        t->age_days = days_between(t->created_at, today_str);
        t->stale_days = days_between(t->last_update, today_str);
        t->is_stale = t->stale_days >= stale_days_threshold;
        t->unassigned = (t->owner[0] == '\0');
        t->sla_risk = t->age_days >= sla_days_threshold;

        double urgency_weight = 0.5;
        double impact_weight = 0.35;
        double age_weight = 0.15;
        double age_factor = (t->age_days > 0) ? (double)t->age_days : 0.0;
        t->score = t->urgency * urgency_weight + t->impact * impact_weight + age_factor * age_weight;

        ticket_count++;
    }
    fclose(fp);

    int open_count = 0;
    int closed_count = 0;
    int unassigned_count = 0;
    int stale_count = 0;
    int high_urgency_count = 0;
    int high_impact_count = 0;
    int sla_risk_count = 0;

    CountEntry category_counts[200];
    CountEntry channel_counts[200];
    int category_count = 0;
    int channel_count = 0;

    for (int i = 0; i < ticket_count; i++) {
        Ticket *t = &tickets[i];
        if (strcmp(t->status, "closed") == 0) {
            closed_count++;
        } else {
            open_count++;
        }
        if (t->unassigned) {
            unassigned_count++;
        }
        if (t->is_stale) {
            stale_count++;
        }
        if (t->urgency >= high_urgency_threshold) {
            high_urgency_count++;
        }
        if (t->impact >= high_impact_threshold) {
            high_impact_count++;
        }
        if (t->sla_risk) {
            sla_risk_count++;
        }
        add_count(category_counts, &category_count, t->category);
        add_count(channel_counts, &channel_count, t->channel);
    }

    qsort(tickets, ticket_count, sizeof(Ticket), compare_ticket_score);
    qsort(category_counts, category_count, sizeof(CountEntry), compare_count_desc);
    qsort(channel_counts, channel_count, sizeof(CountEntry), compare_count_desc);

    printf("Support Triage Summary (%s)\n", today_str);
    printf("Open: %d | Closed: %d | Unassigned: %d\n", open_count, closed_count, unassigned_count);
    printf("Stale (>= %d days): %d | SLA risk (>= %d days): %d\n", stale_days_threshold, stale_count, sla_days_threshold, sla_risk_count);
    printf("High urgency (>= %d): %d | High impact (>= %d): %d\n", high_urgency_threshold, high_impact_threshold, high_impact_count);

    printf("\nTop Categories:\n");
    for (int i = 0; i < category_count && i < 5; i++) {
        printf("  %s (%d)\n", category_counts[i].key, category_counts[i].count);
    }

    printf("\nTop Channels:\n");
    for (int i = 0; i < channel_count && i < 5; i++) {
        printf("  %s (%d)\n", channel_counts[i].key, channel_counts[i].count);
    }

    printf("\nAction Queue (top %d)\n", limit);
    int listed = 0;
    for (int i = 0; i < ticket_count && listed < limit; i++) {
        if (strcmp(tickets[i].status, "closed") == 0) {
            continue;
        }
        printf("%d. %s | Scholar %s | %s | urgency %d | impact %d | age %d days | stale %d days | score %.2f | owner %s\n",
               listed + 1,
               tickets[i].ticket_id,
               tickets[i].scholar_id,
               tickets[i].category,
               tickets[i].urgency,
               tickets[i].impact,
               tickets[i].age_days,
               tickets[i].stale_days,
               tickets[i].score,
               tickets[i].owner[0] ? tickets[i].owner : "unassigned");
        listed++;
    }

    if (json_path) {
        FILE *out = fopen(json_path, "w");
        if (!out) {
            fprintf(stderr, "Could not write JSON to %s\n", json_path);
            return 1;
        }
        write_json(out, tickets, ticket_count,
                   open_count, closed_count,
                   unassigned_count, stale_count,
                   high_urgency_count, high_impact_count,
                   sla_risk_count, limit,
                   category_counts, category_count,
                   channel_counts, channel_count);
        fclose(out);
        printf("\nWrote JSON report to %s\n", json_path);
    }

    return 0;
}
